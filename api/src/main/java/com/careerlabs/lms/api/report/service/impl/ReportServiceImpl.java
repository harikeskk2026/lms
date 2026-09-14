package com.careerlabs.lms.api.report.service.impl;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.report.dto.request.AttendanceReportRequest;
import com.careerlabs.lms.api.report.dto.request.PerformanceReportRequest;
import com.careerlabs.lms.api.report.dto.request.PlacementReportRequest;
import com.careerlabs.lms.api.report.dto.response.AssignmentAnalyticsResponse;
import com.careerlabs.lms.api.report.dto.response.AttendanceReportResponse;
import com.careerlabs.lms.api.report.dto.response.BatchHealthResponse;
import com.careerlabs.lms.api.report.dto.response.CorrelationResponse;
import com.careerlabs.lms.api.report.dto.response.DecliningStudentResponse;
import com.careerlabs.lms.api.report.dto.response.EngagementResponse;
import com.careerlabs.lms.api.report.dto.response.LeaderboardEntryResponse;
import com.careerlabs.lms.api.report.dto.response.LmsActivityPointResponse;
import com.careerlabs.lms.api.report.dto.response.OverviewResponse;
import com.careerlabs.lms.api.report.dto.response.PerformanceReportResponse;
import com.careerlabs.lms.api.report.dto.response.PlacementReadinessResponse;
import com.careerlabs.lms.api.report.dto.response.PlacementReportResponse;
import com.careerlabs.lms.api.report.dto.response.QuizAnalyticsResponse;
import com.careerlabs.lms.api.report.dto.response.ReportStudentResponse;
import com.careerlabs.lms.api.report.dto.response.ReportSummaryResponse;
import com.careerlabs.lms.api.report.dto.response.TrendPointResponse;
import com.careerlabs.lms.api.report.service.ReportService;
import com.careerlabs.lms.api.report.validation.ReportValidator;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.PlacementStatusCount;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;

@Service
public class ReportServiceImpl implements ReportService {

    /** Thresholds defined centrally here — no attendance/quiz/risk thresholds already exist in the project. */
    private static final double LOW_COMPLETION_THRESHOLD_PCT = 60.0;
    private static final double LOW_SCORE_THRESHOLD_PCT = 60.0;
    private static final double DIFFICULT_THRESHOLD_PCT = 70.0;
    private static final double BATCH_HEALTH_GOOD_THRESHOLD_PCT = 80.0;
    private static final double BATCH_HEALTH_AVERAGE_THRESHOLD_PCT = 60.0;
    private static final int RISK_CRITICAL_THRESHOLD = 75;
    private static final int RISK_HIGH_THRESHOLD = 50;
    private static final int RISK_MEDIUM_THRESHOLD = 25;
    private static final long ENGAGEMENT_HIGH_ACTIVITY_COUNT = 8;
    private static final long ENGAGEMENT_MEDIUM_ACTIVITY_COUNT = 3;
    private static final double READINESS_READY_THRESHOLD_PCT = 80.0;
    private static final double READINESS_NEARLY_READY_THRESHOLD_PCT = 65.0;
    private static final double READINESS_NEEDS_IMPROVEMENT_THRESHOLD_PCT = 45.0;
    private static final double DECLINE_MARGIN_PCT = 5.0;
    private static final double ATTENDANCE_HEALTHY_THRESHOLD_PCT = 75.0;
    private static final double ATTENDANCE_AT_RISK_THRESHOLD_PCT = 65.0;
    private static final String REASON_LOW_COMPLETION = "Low assignment completion";
    private static final String REASON_LOW_SCORE = "Low assignment scores";
    private static final String REASON_LOW_QUIZ = "Low quiz scores";
    private static final String CORRELATION_NOTE = "Relationship observed across current students — not a claim of causation.";

    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final AttendanceRepository attendanceRepository;
    private final DailyClassRepository dailyClassRepository;
    private final ReportValidator reportValidator;

    public ReportServiceImpl(BatchRepository batchRepository,
                              CourseRepository courseRepository,
                              StudentRepository studentRepository,
                              EnrollmentRepository enrollmentRepository,
                              AssignmentRepository assignmentRepository,
                              AssignmentSubmissionRepository submissionRepository,
                              QuizAttemptRepository quizAttemptRepository,
                              AttendanceRepository attendanceRepository,
                              DailyClassRepository dailyClassRepository,
                              ReportValidator reportValidator) {
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.attendanceRepository = attendanceRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.reportValidator = reportValidator;
    }

    private String getStudentBatchNames(Student student) {
        if (student == null || student.getId() == null) {
            return null;
        }
        List<Enrollment> enrollments = enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
        String names = enrollments.stream()
                .map(Enrollment::getBatch)
                .filter(java.util.Objects::nonNull)
                .map(Batch::getName)
                .distinct()
                .collect(Collectors.joining(", "));
        return names.isEmpty() ? null : names;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceReportResponse getAttendanceReport(AttendanceReportRequest request) {
        reportValidator.validateBatchExists(request.getBatchId());
        reportValidator.validateCourseExists(request.getCourseId());
        reportValidator.validateStudentExists(request.getStudentId());
        reportValidator.validateDateRange(request.getStartDate(), request.getEndDate());

        List<Batch> batches = request.getBatchId() != null ?
                batchRepository.findById(request.getBatchId()).map(List::of).orElse(List.of()) :
                batchRepository.findAll();
        if (request.getCourseId() != null) {
            batches = batches.stream()
                    .filter(b -> b.getCourse() != null && b.getCourse().getId().equals(request.getCourseId()))
                    .toList();
        }

        LocalDateTime rangeStart = request.getStartDate() != null ? request.getStartDate().atStartOfDay() : null;
        LocalDateTime rangeEnd = request.getEndDate() != null ? request.getEndDate().atTime(LocalTime.MAX) : null;

        List<AttendanceReportResponse.BatchAttendance> attendanceByBatch = new ArrayList<>();
        List<DailyClass> allClasses = new ArrayList<>();
        List<Attendance> allAttendances = new ArrayList<>();
        List<ReportStudentResponse> studentRows = new ArrayList<>();

        int totalPresent = 0, totalAbsent = 0, totalLate = 0, totalExcused = 0;

        for (Batch batch : batches) {
            List<DailyClass> classes = rangeStart != null && rangeEnd != null
                    ? dailyClassRepository.findByBatchIdAndDateBetweenOrderByDateAsc(batch.getId(), rangeStart, rangeEnd)
                    : dailyClassRepository.findByBatchIdOrderByDateDesc(batch.getId());
            List<Long> classIds = classes.stream().map(DailyClass::getId).toList();
            List<Attendance> attendances = classIds.isEmpty() ? List.of() : attendanceRepository.findByDailyClassIdIn(classIds);

            allClasses.addAll(classes);
            allAttendances.addAll(attendances);

            totalPresent += (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.PRESENT).count();
            totalAbsent += (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.ABSENT).count();
            totalLate += (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.LATE).count();
            totalExcused += (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.EXCUSED).count();

            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            if (request.getStudentId() != null) {
                students = students.stream().filter(s -> s.getId().equals(request.getStudentId())).toList();
            }

            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

            List<Double> studentPcts = new ArrayList<>();
            for (Student student : students) {
                List<Attendance> sAtt = byStudent.getOrDefault(student.getId(), List.of());
                long sp = sAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                long sab = sAtt.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
                Double pct = sAtt.isEmpty() ? null : round1(sp * 100.0 / sAtt.size());
                if (pct != null) {
                    studentPcts.add(pct);
                }

                studentRows.add(new ReportStudentResponse(
                        student.getId(),
                        student.getUser().getName(),
                        batch.getName(),
                        pct,
                        null,
                        0,
                        null,
                        null,
                        null,
                        attendanceStatus(pct),
                        List.of(),
                        List.of(),
                        null,
                        null,
                        List.of(),
                        sAtt.isEmpty() ? null : (int) sp,
                        sAtt.isEmpty() ? null : (int) sab));
            }

            double avgPct = studentPcts.isEmpty() ? 0.0 : round1(studentPcts.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
            attendanceByBatch.add(new AttendanceReportResponse.BatchAttendance(
                    batch.getId(),
                    batch.getName(),
                    avgPct
            ));
        }

        List<AttendanceReportResponse.StatusCount> distribution = List.of(
                new AttendanceReportResponse.StatusCount("PRESENT", totalPresent),
                new AttendanceReportResponse.StatusCount("ABSENT", totalAbsent),
                new AttendanceReportResponse.StatusCount("LATE", totalLate),
                new AttendanceReportResponse.StatusCount("EXCUSED", totalExcused)
        );

        List<AttendanceReportResponse.TrendPoint> trendPoints = attendanceWeeklyTrend(allClasses, allAttendances);

        List<Double> presentPcts = studentRows.stream()
                .map(ReportStudentResponse::attendancePct)
                .filter(pct -> pct != null)
                .toList();
        long lowAttendanceCount = presentPcts.stream().filter(pct -> pct < ATTENDANCE_AT_RISK_THRESHOLD_PCT).count();

        ReportSummaryResponse summary = new ReportSummaryResponse(
                studentRows.size(),
                presentPcts.isEmpty() ? null : round1(presentPcts.stream().mapToDouble(Double::doubleValue).average().orElse(0.0)),
                null,
                null,
                null);

        return new AttendanceReportResponse(
                true,
                "Attendance report generated successfully",
                summary,
                trendPoints,
                attendanceByBatch,
                distribution,
                studentRows,
                allClasses.size(),
                (int) lowAttendanceCount
        );
    }

    private String attendanceStatus(Double pct) {
        if (pct == null) {
            return null;
        }
        if (pct >= ATTENDANCE_HEALTHY_THRESHOLD_PCT) {
            return "HEALTHY";
        }
        if (pct >= ATTENDANCE_AT_RISK_THRESHOLD_PCT) {
            return "AT_RISK";
        }
        return "CRITICAL";
    }

    private List<AttendanceReportResponse.TrendPoint> attendanceWeeklyTrend(List<DailyClass> classes, List<Attendance> attendances) {
        if (classes.isEmpty()) {
            return List.of();
        }
        WeekFields weekFields = WeekFields.ISO;
        Map<Long, String> weekByClassId = new LinkedHashMap<>();
        for (DailyClass dailyClass : classes) {
            LocalDate date = dailyClass.getDate().toLocalDate();
            int year = date.get(weekFields.weekBasedYear());
            int week = date.get(weekFields.weekOfWeekBasedYear());
            weekByClassId.put(dailyClass.getId(), "%d-W%02d".formatted(year, week));
        }

        Map<String, List<Attendance>> byWeek = attendances.stream()
                .filter(a -> weekByClassId.containsKey(a.getDailyClass().getId()))
                .collect(Collectors.groupingBy(
                        a -> weekByClassId.get(a.getDailyClass().getId()),
                        TreeMap::new,
                        Collectors.toList()));

        return byWeek.entrySet().stream()
                .map(entry -> {
                    List<Attendance> weekAttendances = entry.getValue();
                    long present = weekAttendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                    double pct = weekAttendances.isEmpty() ? 0.0 : round1(present * 100.0 / weekAttendances.size());
                    return new AttendanceReportResponse.TrendPoint(entry.getKey(), pct);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PerformanceReportResponse getPerformanceReport(PerformanceReportRequest request) {
        Long batchId = request.getBatchId();
        Long courseId = request.getCourseId();
        reportValidator.validateBatchExists(batchId);
        reportValidator.validateCourseExists(courseId);

        List<Student> students = filterStudents(batchId, courseId);
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        Map<Long, List<AssignmentSubmission>> byStudent = submissionsByStudent(studentIds);
        Map<Long, List<QuizAttempt>> quizByStudent = quizAttemptsByStudent(studentIds);
        Map<Long, List<Attendance>> attendanceByStudent = attendanceByStudent(studentIds);

        List<ReportStudentResponse> rows = students.stream()
                .map(s -> toStudentRow(s, byStudent.getOrDefault(s.getId(), List.of()),
                        quizByStudent.getOrDefault(s.getId(), List.of()),
                        attendanceByStudent.getOrDefault(s.getId(), List.of())))
                .sorted(Comparator.comparing(ReportStudentResponse::studentName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<Course> allCourses = courseRepository.findAllByOrderByCreatedAtDesc();
        Map<Long, List<Assignment>> assignmentsByCourse = allCourses.isEmpty() ? Map.of() : assignmentRepository
                .findByCourseIdIn(allCourses.stream().map(Course::getId).toList()).stream()
                .collect(Collectors.groupingBy(a -> a.getCourse().getId()));
        List<Long> courseAssignmentIds = assignmentsByCourse.values().stream()
                .flatMap(List::stream).map(Assignment::getId).distinct().toList();
        Map<Long, List<AssignmentSubmission>> courseSubmissionsByAssignmentId = courseAssignmentIds.isEmpty()
                ? Map.of()
                : submissionRepository.findByAssignmentIdIn(courseAssignmentIds).stream()
                        .collect(Collectors.groupingBy(s -> s.getAssignment().getId()));
        List<PerformanceReportResponse.CourseBreakdown> courseBreakdown = allCourses.stream()
                .map(c -> toCourseBreakdown(c, assignmentsByCourse.getOrDefault(c.getId(), List.of()), courseSubmissionsByAssignmentId))
                .toList();

        List<Batch> allBatches = batchRepository.findAllByOrderByCreatedAtDesc();
        Map<Long, List<Student>> studentsByBatch = allBatches.isEmpty() ? Map.of() : enrollmentRepository
                .findByBatchIdInAndActiveTrue(allBatches.stream().map(Batch::getId).toList()).stream()
                .filter(e -> e.getBatch() != null && e.getStudent() != null)
                .collect(Collectors.groupingBy(e -> e.getBatch().getId(), Collectors.mapping(Enrollment::getStudent, Collectors.toList())));
        Map<Long, List<Assignment>> assignmentsByBatch = allBatches.isEmpty() ? Map.of() : assignmentRepository
                .findByBatchIdInAndStatusIn(allBatches.stream().map(Batch::getId).toList(),
                        List.of(AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED)).stream()
                .collect(Collectors.groupingBy(a -> a.getBatch().getId()));
        List<Long> batchAssignmentIds = assignmentsByBatch.values().stream()
                .flatMap(List::stream).map(Assignment::getId).distinct().toList();
        Map<Long, List<AssignmentSubmission>> batchSubmissionsByAssignmentId = batchAssignmentIds.isEmpty()
                ? Map.of()
                : submissionRepository.findByAssignmentIdIn(batchAssignmentIds).stream()
                        .collect(Collectors.groupingBy(s -> s.getAssignment().getId()));
        List<PerformanceReportResponse.BatchBreakdown> batchBreakdown = allBatches.stream()
                .map(b -> toBatchBreakdown(b, studentsByBatch.getOrDefault(b.getId(), List.of()),
                        assignmentsByBatch.getOrDefault(b.getId(), List.of()), batchSubmissionsByAssignmentId))
                .toList();

        List<AssignmentSubmission> allSubmissions = byStudent.values().stream().flatMap(List::stream).toList();
        List<PerformanceReportResponse.TrendPoint> trend = computeTrend(allSubmissions);
        List<PerformanceReportResponse.AtRiskBreakdown> atRiskBreakdown = computeAtRiskBreakdown(students, byStudent, quizByStudent);

        return new PerformanceReportResponse(summarize(rows), rows, courseBreakdown, batchBreakdown, trend, atRiskBreakdown);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportStudentResponse getStudentPerformance(Long studentId) {
        Student student = findStudentOrThrow(studentId);

        List<AssignmentSubmission> submissions = submissionRepository.findByStudentId(studentId);
        List<QuizAttempt> quizAttempts = quizAttemptRepository.findByStudentIdInAndStatus(List.of(studentId), AttemptStatus.SUBMITTED);
        Double completionPct = completionPctForStudent(student, submissions.size());
        Double avgScorePct = averageScorePct(submissions);
        Double quizPct = avgQuizAccuracy(quizAttempts);
        Double overall = blend(completionPct, avgScorePct);
        Integer risk = riskScore(completionPct, avgScorePct, quizPct);
        Double attendancePct = attendancePctForStudent(studentId);

        Map<Long, List<AssignmentSubmission>> byCourse = submissions.stream()
                .filter(s -> s.getMarks() != null)
                .collect(Collectors.groupingBy(s -> s.getAssignment().getCourse().getId()));

        List<ReportStudentResponse.CourseScore> courseBreakdown = byCourse.values().stream()
                .map(group -> {
                    Course course = group.get(0).getAssignment().getCourse();
                    return new ReportStudentResponse.CourseScore(course.getId(), course.getTitle(), averageScorePct(group));
                })
                .sorted(Comparator.comparing(ReportStudentResponse.CourseScore::courseTitle, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<TrendPointResponse> progressTrend = weeklyTrend(submissions);

        return new ReportStudentResponse(
                student.getId(),
                student.getUser().getName(),
                getStudentBatchNames(student),
                attendancePct,
                quizPct,
                submissions.size(),
                avgScorePct,
                completionPct,
                overall,
                null,
                List.of(),
                courseBreakdown,
                risk,
                riskLevel(risk),
                progressTrend,
                null,
                null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportStudentResponse> getAtRiskStudents(Long batchId) {
        reportValidator.validateBatchExists(batchId);
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();

        List<Long> studentIds = students.stream().map(Student::getId).toList();
        Map<Long, List<AssignmentSubmission>> byStudent = submissionsByStudent(studentIds);
        Map<Long, List<QuizAttempt>> quizByStudent = quizAttemptsByStudent(studentIds);

        List<ReportStudentResponse> atRisk = new ArrayList<>();
        for (Student student : students) {
            List<AssignmentSubmission> submissions = byStudent.getOrDefault(student.getId(), List.of());
            List<QuizAttempt> quizAttempts = quizByStudent.getOrDefault(student.getId(), List.of());
            Double completionPct = completionPctForStudent(student, submissions.size());
            Double avgScorePct = averageScorePct(submissions);
            Double quizPct = avgQuizAccuracy(quizAttempts);

            List<String> reasons = reasonsFor(completionPct, avgScorePct, quizPct);
            if (!reasons.isEmpty()) {
                Integer risk = riskScore(completionPct, avgScorePct, quizPct);
                atRisk.add(new ReportStudentResponse(
                        student.getId(),
                        student.getUser().getName(),
                        getStudentBatchNames(student),
                        null,
                        quizPct,
                        submissions.size(),
                        avgScorePct,
                        completionPct,
                        blend(completionPct, avgScorePct),
                        "AT_RISK",
                        reasons,
                        List.of(),
                        risk,
                        riskLevel(risk),
                        List.of(),
                        null,
                        null));
            }
        }
        return atRisk;
    }

    @Override
    @Transactional(readOnly = true)
    public PlacementReportResponse getPlacementReport(PlacementReportRequest request) {
        Long batchId = request.getBatchId();
        reportValidator.validateBatchExists(batchId);

        Map<PlacementStatus, Long> statusCounts = new LinkedHashMap<>();
        for (PlacementStatus status : PlacementStatus.values()) {
            statusCounts.put(status, 0L);
        }

        if (batchId != null) {
            for (Student student : enrollmentRepository.findActiveStudentsByBatchId(batchId)) {
                statusCounts.merge(student.getPlacementStatus(), 1L, Long::sum);
            }
        } else {
            for (PlacementStatusCount count : studentRepository.countGroupedByPlacementStatus()) {
                statusCounts.put(count.getStatus(), count.getCount());
            }
        }

        long total = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        long placed = statusCounts.getOrDefault(PlacementStatus.PLACED, 0L);
        double conversionRate = total > 0 ? round1(placed * 100.0 / total) : 0.0;

        List<Batch> allBatches = batchRepository.findAllByOrderByCreatedAtDesc();
        Map<Long, List<Student>> studentsByBatch = allBatches.isEmpty() ? Map.of() : enrollmentRepository
                .findByBatchIdInAndActiveTrue(allBatches.stream().map(Batch::getId).toList()).stream()
                .filter(e -> e.getBatch() != null && e.getStudent() != null)
                .collect(Collectors.groupingBy(e -> e.getBatch().getId(), Collectors.mapping(Enrollment::getStudent, Collectors.toList())));
        List<PlacementReportResponse.BatchPlacement> byBatch = allBatches.stream()
                .map(b -> toBatchPlacement(b, studentsByBatch.getOrDefault(b.getId(), List.of())))
                .toList();

        List<Course> allCourses = courseRepository.findAllByOrderByCreatedAtDesc();
        Map<Long, List<Student>> studentsByCourse = allCourses.isEmpty() ? Map.of() : studentRepository
                .findByCourseIdIn(allCourses.stream().map(Course::getId).toList()).stream()
                .collect(Collectors.groupingBy(s -> s.getCourse().getId()));
        List<PlacementReportResponse.CoursePlacement> byCourse = allCourses.stream()
                .map(c -> toCoursePlacement(c, studentsByCourse.getOrDefault(c.getId(), List.of())))
                .toList();

        return new PlacementReportResponse(statusCounts, conversionRate, byBatch, byCourse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> export(String type, Long batchId, LocalDate startDate, LocalDate endDate) {
        reportValidator.validateBatchExists(batchId);
        reportValidator.validateDateRange(startDate, endDate);

        return switch (type) {
            case "students" -> exportStudents(batchId);
            case "performance" -> exportPerformance(batchId);
            case "attendance" -> exportAttendance(batchId);
            default -> throw new BadRequestException("Unknown export type: " + type);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public OverviewResponse getOverview() {
        return getOverview(getPerformanceReport(new PerformanceReportRequest()));
    }

    @Override
    @Transactional(readOnly = true)
    public OverviewResponse getOverview(PerformanceReportResponse performance) {
        long totalStudents = studentRepository.count();
        long activeBatches = batchRepository.findAllByOrderByCreatedAtDesc().stream().filter(Batch::isActive).count();
        long activeCourses = courseRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(c -> c.getStatus() == com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED)
                .count();

        PlacementReportResponse placement = getPlacementReport(new PlacementReportRequest());

        long atRiskCount = performance.students().stream()
                .filter(s -> "HIGH".equals(s.riskLevel()) || "CRITICAL".equals(s.riskLevel()))
                .count();

        return new OverviewResponse(
                totalStudents,
                activeBatches,
                activeCourses,
                null,
                performance.summary().overallPerformancePct(),
                performance.summary().averageCompletionPct(),
                performance.summary().averageQuizScorePct(),
                placement.conversionRate(),
                atRiskCount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchHealthResponse> getBatchHealth() {
        return batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toBatchHealth)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BatchHealthResponse getBatchHealth(Long batchId) {
        return toBatchHealth(findBatchOrThrow(batchId));
    }

    @Override
    @Transactional(readOnly = true)
    public QuizAnalyticsResponse getQuizAnalytics(Long batchId, Long courseId) {
        reportValidator.validateBatchExists(batchId);
        reportValidator.validateCourseExists(courseId);

        List<Student> students = filterStudents(batchId, courseId);
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        List<QuizAttempt> attempts = studentIds.isEmpty()
                ? List.of()
                : quizAttemptRepository.findByStudentIdInAndStatus(studentIds, AttemptStatus.SUBMITTED);

        Double avgScore = avgQuizAccuracy(attempts);
        long total = attempts.size();
        long withPassFlag = attempts.stream().filter(a -> a.getPassed() != null).count();
        long passed = attempts.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();
        Double passRate = withPassFlag > 0 ? round1(passed * 100.0 / withPassFlag) : null;
        Double failRate = passRate != null ? round1(100.0 - passRate) : null;
        Double avgAttemptsPerStudent = studentIds.isEmpty() ? null : round1(total * 1.0 / studentIds.size());

        Map<Long, List<QuizAttempt>> byQuiz = attempts.stream().collect(Collectors.groupingBy(a -> a.getQuiz().getId()));
        List<QuizAnalyticsResponse.QuizBreakdown> breakdown = byQuiz.values().stream()
                .map(group -> {
                    Quiz quiz = group.get(0).getQuiz();
                    Double qAvg = avgQuizAccuracy(group);
                    long qWithFlag = group.stream().filter(a -> a.getPassed() != null).count();
                    long qPassed = group.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();
                    Double qPassRate = qWithFlag > 0 ? round1(qPassed * 100.0 / qWithFlag) : null;
                    return new QuizAnalyticsResponse.QuizBreakdown(quiz.getId(), quiz.getTitle(), qAvg, qPassRate, group.size(), difficultyStatus(qAvg));
                })
                .sorted(Comparator.comparing(QuizAnalyticsResponse.QuizBreakdown::title, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return new QuizAnalyticsResponse(avgScore, passRate, failRate, total, avgAttemptsPerStudent, breakdown);
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentAnalyticsResponse getAssignmentAnalytics(Long batchId) {
        reportValidator.validateBatchExists(batchId);
        List<Batch> batches = batchId != null ? List.of(findBatchOrThrow(batchId)) : batchRepository.findAllByOrderByCreatedAtDesc();

        long totalPossible = 0;
        long totalSubmitted = 0;
        long totalLate = 0;
        List<Double> scores = new ArrayList<>();
        List<AssignmentAnalyticsResponse.BatchCompletion> byBatch = new ArrayList<>();

        for (Batch batch : batches) {
            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            List<Assignment> assignments = assignmentRepository.findByBatchIdAndStatusInOrderByDueDateAsc(
                    batch.getId(), List.of(AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED));
            List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
            List<AssignmentSubmission> submissions = assignmentIds.isEmpty()
                    ? List.of()
                    : submissionRepository.findByAssignmentIdIn(assignmentIds);

            long possible = (long) students.size() * assignments.size();
            totalPossible += possible;
            totalSubmitted += submissions.size();
            totalLate += submissions.stream().filter(AssignmentSubmission::isLate).count();
            for (AssignmentSubmission s : submissions) {
                if (s.getMarks() != null && s.getAssignment().getTotalMarks() > 0) {
                    scores.add(s.getMarks() * 100.0 / s.getAssignment().getTotalMarks());
                }
            }

            Double completionPct = possible > 0 ? round1(submissions.size() * 100.0 / possible) : null;
            byBatch.add(new AssignmentAnalyticsResponse.BatchCompletion(batch.getId(), batch.getName(), completionPct));
        }

        Double submissionRate = totalPossible > 0 ? round1(totalSubmitted * 100.0 / totalPossible) : null;
        Double lateRate = totalSubmitted > 0 ? round1(totalLate * 100.0 / totalSubmitted) : null;
        Double missingRate = totalPossible > 0 ? round1((totalPossible - totalSubmitted) * 100.0 / totalPossible) : null;
        Double avgScore = scores.isEmpty() ? null : round1(scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));

        return new AssignmentAnalyticsResponse(submissionRate, lateRate, missingRate, avgScore, byBatch);
    }

    @Override
    @Transactional(readOnly = true)
    public EngagementResponse getEngagement(Long batchId) {
        reportValidator.validateBatchExists(batchId);
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        if (studentIds.isEmpty()) {
            return new EngagementResponse(0, 0, 0, 0, 0, 0);
        }

        Map<Long, List<AssignmentSubmission>> byStudent = submissionsByStudent(studentIds);
        Map<Long, List<QuizAttempt>> quizByStudent = quizAttemptsByStudent(studentIds);

        long high = 0;
        long medium = 0;
        long low = 0;
        for (Long id : studentIds) {
            long activity = byStudent.getOrDefault(id, List.of()).size() + quizByStudent.getOrDefault(id, List.of()).size();
            if (activity >= ENGAGEMENT_HIGH_ACTIVITY_COUNT) {
                high++;
            } else if (activity >= ENGAGEMENT_MEDIUM_ACTIVITY_COUNT) {
                medium++;
            } else {
                low++;
            }
        }

        long total = studentIds.size();
        return new EngagementResponse(high, medium, low,
                round1(high * 100.0 / total), round1(medium * 100.0 / total), round1(low * 100.0 / total));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LmsActivityPointResponse> getActivityTrend() {
        Map<String, Long> studentsByMonth = studentRepository.findAll().stream()
                .filter(s -> s.getCreatedAt() != null)
                .collect(Collectors.groupingBy(s -> monthKey(s.getCreatedAt()), Collectors.counting()));
        Map<String, Long> assignmentsByMonth = assignmentRepository.findAll().stream()
                .filter(a -> a.getCreatedAt() != null)
                .collect(Collectors.groupingBy(a -> monthKey(a.getCreatedAt()), Collectors.counting()));
        Map<String, Long> attemptsByMonth = quizAttemptRepository.findByStatus(AttemptStatus.SUBMITTED).stream()
                .filter(a -> a.getCompletedAt() != null)
                .collect(Collectors.groupingBy(a -> monthKey(a.getCompletedAt()), Collectors.counting()));

        Set<String> months = new TreeSet<>();
        months.addAll(studentsByMonth.keySet());
        months.addAll(assignmentsByMonth.keySet());
        months.addAll(attemptsByMonth.keySet());

        return months.stream()
                .map(m -> new LmsActivityPointResponse(m,
                        studentsByMonth.getOrDefault(m, 0L),
                        assignmentsByMonth.getOrDefault(m, 0L),
                        attemptsByMonth.getOrDefault(m, 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getTopStudents(Long batchId, int limit) {
        PerformanceReportRequest request = new PerformanceReportRequest();
        request.setBatchId(batchId);
        List<ReportStudentResponse> ranked = getPerformanceReport(request).students().stream()
                .filter(r -> r.overallPerformancePct() != null)
                .sorted(Comparator.comparing(ReportStudentResponse::overallPerformancePct).reversed())
                .toList();

        List<LeaderboardEntryResponse> result = new ArrayList<>();
        int rank = 1;
        for (ReportStudentResponse r : ranked) {
            if (rank > limit) {
                break;
            }
            result.add(new LeaderboardEntryResponse(rank++, r.studentId(), r.studentName(), r.batchName(), r.overallPerformancePct()));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getBatchLeaderboard() {
        List<BatchHealthResponse> ranked = getBatchHealth().stream()
                .filter(b -> b.healthScore() != null)
                .sorted(Comparator.comparing(BatchHealthResponse::healthScore).reversed())
                .toList();

        List<LeaderboardEntryResponse> result = new ArrayList<>();
        int rank = 1;
        for (BatchHealthResponse b : ranked) {
            result.add(new LeaderboardEntryResponse(rank++, b.batchId(), b.batchName(), b.status(), b.healthScore()));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DecliningStudentResponse> getDecliningStudents(Long batchId) {
        reportValidator.validateBatchExists(batchId);
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();

        List<DecliningStudentResponse> declining = new ArrayList<>();
        for (Student student : students) {
            List<AssignmentSubmission> submissions = submissionRepository.findByStudentId(student.getId());
            List<TrendPointResponse> trend = weeklyTrend(submissions);
            if (trend.size() < 2) {
                continue;
            }
            TrendPointResponse previous = trend.get(trend.size() - 2);
            TrendPointResponse current = trend.get(trend.size() - 1);
            if (previous.value() == null || current.value() == null) {
                continue;
            }
            double change = current.value() - previous.value();
            if (change < -DECLINE_MARGIN_PCT) {
                declining.add(new DecliningStudentResponse(
                        student.getId(),
                        student.getUser().getName(),
                        getStudentBatchNames(student),
                        round1(current.value()),
                        round1(previous.value()),
                        round1(change),
                        "DECLINING"));
            }
        }
        return declining;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlacementReadinessResponse> getPlacementReadiness(Long batchId) {
        reportValidator.validateBatchExists(batchId);
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        Map<Long, List<AssignmentSubmission>> byStudent = submissionsByStudent(studentIds);
        Map<Long, List<QuizAttempt>> quizByStudent = quizAttemptsByStudent(studentIds);

        return students.stream()
                .map(student -> {
                    List<AssignmentSubmission> submissions = byStudent.getOrDefault(student.getId(), List.of());
                    Double completionPct = completionPctForStudent(student, submissions.size());
                    Double avgScorePct = averageScorePct(submissions);
                    Double quizPct = avgQuizAccuracy(quizByStudent.getOrDefault(student.getId(), List.of()));
                    Double performancePct = blend(completionPct, avgScorePct);

                    Double readiness;
                    String status;
                    if (student.getPlacementStatus() == PlacementStatus.PLACED) {
                        readiness = 100.0;
                        status = "READY";
                    } else {
                        readiness = average(Arrays.asList(completionPct, avgScorePct, quizPct));
                        status = readinessStatus(readiness);
                    }

                    return new PlacementReadinessResponse(
                            student.getId(),
                            student.getUser().getName(),
                            getStudentBatchNames(student),
                            performancePct,
                            quizPct,
                            completionPct,
                            readiness,
                            status,
                            student.getPlacementStatus().name());
                })
                .sorted(Comparator.comparing(PlacementReadinessResponse::readinessScore, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CorrelationResponse> getCorrelations(Long batchId) {
        reportValidator.validateBatchExists(batchId);
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        Map<Long, List<AssignmentSubmission>> byStudent = submissionsByStudent(studentIds);
        Map<Long, List<QuizAttempt>> quizByStudent = quizAttemptsByStudent(studentIds);

        List<CorrelationResponse.Point> completionVsScore = new ArrayList<>();
        List<CorrelationResponse.Point> scoreVsQuiz = new ArrayList<>();
        for (Student student : students) {
            List<AssignmentSubmission> submissions = byStudent.getOrDefault(student.getId(), List.of());
            Double completionPct = completionPctForStudent(student, submissions.size());
            Double avgScorePct = averageScorePct(submissions);
            Double quizPct = avgQuizAccuracy(quizByStudent.getOrDefault(student.getId(), List.of()));

            if (completionPct != null && avgScorePct != null) {
                completionVsScore.add(new CorrelationResponse.Point(completionPct, avgScorePct, student.getUser().getName()));
            }
            if (avgScorePct != null && quizPct != null) {
                scoreVsQuiz.add(new CorrelationResponse.Point(avgScorePct, quizPct, student.getUser().getName()));
            }
        }

        List<CorrelationResponse> correlations = new ArrayList<>();
        if (!completionVsScore.isEmpty()) {
            correlations.add(new CorrelationResponse(
                    "Assignment Completion vs Assignment Score",
                    "Assignment Completion %", "Average Assignment Score %",
                    completionVsScore, CORRELATION_NOTE));
        }
        if (!scoreVsQuiz.isEmpty()) {
            correlations.add(new CorrelationResponse(
                    "Assignment Score vs Quiz Score",
                    "Average Assignment Score %", "Average Quiz Score %",
                    scoreVsQuiz, CORRELATION_NOTE));
        }
        return correlations;
    }

    // ---------------------------------------------------------------- helpers

    private List<Student> filterStudents(Long batchId, Long courseId) {
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();
        if (courseId != null) {
            List<Long> activeStudentIds = enrollmentRepository.findActiveStudentIdsByCourseId(courseId);
            students = students.stream()
                    .filter(s -> activeStudentIds.contains(s.getId()))
                    .toList();
        }
        return students;
    }

    private Map<Long, List<AssignmentSubmission>> submissionsByStudent(List<Long> studentIds) {
        if (studentIds.isEmpty()) {
            return Map.of();
        }
        return submissionRepository.findByStudentIdIn(studentIds).stream()
                .collect(Collectors.groupingBy(s -> s.getStudent().getId()));
    }

    private Map<Long, List<Attendance>> attendanceByStudent(List<Long> studentIds) {
        if (studentIds.isEmpty()) {
            return Map.of();
        }
        return attendanceRepository.findByStudentIdIn(studentIds).stream()
                .collect(Collectors.groupingBy(a -> a.getStudent().getId()));
    }

    private Map<Long, List<QuizAttempt>> quizAttemptsByStudent(List<Long> studentIds) {
        if (studentIds.isEmpty()) {
            return Map.of();
        }
        return quizAttemptRepository.findByStudentIdInAndStatus(studentIds, AttemptStatus.SUBMITTED).stream()
                .collect(Collectors.groupingBy(QuizAttempt::getStudentId));
    }

    private Double avgQuizAccuracy(List<QuizAttempt> attempts) {
        List<Double> scores = attempts.stream()
                .map(this::effectiveAccuracy)
                .filter(v -> v != null)
                .toList();
        if (scores.isEmpty()) {
            return null;
        }
        return round1(scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
    }

    private Double effectiveAccuracy(QuizAttempt attempt) {
        if (attempt.getAccuracy() != null) {
            return attempt.getAccuracy();
        }
        if (attempt.getScore() != null && attempt.getTotalScore() != null && attempt.getTotalScore() > 0) {
            return attempt.getScore() * 100.0 / attempt.getTotalScore();
        }
        return null;
    }

    private Integer riskScore(Double completionPct, Double avgScorePct, Double quizPct) {
        Double avg = average(Arrays.asList(completionPct, avgScorePct, quizPct));
        if (avg == null) {
            return null;
        }
        return (int) Math.round(100 - avg);
    }

    private String riskLevel(Integer score) {
        if (score == null) {
            return null;
        }
        if (score >= RISK_CRITICAL_THRESHOLD) {
            return "CRITICAL";
        }
        if (score >= RISK_HIGH_THRESHOLD) {
            return "HIGH";
        }
        if (score >= RISK_MEDIUM_THRESHOLD) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String difficultyStatus(Double avgScorePct) {
        if (avgScorePct == null) {
            return null;
        }
        if (avgScorePct < LOW_SCORE_THRESHOLD_PCT) {
            return "DIFFICULT";
        }
        if (avgScorePct < DIFFICULT_THRESHOLD_PCT) {
            return "MODERATE";
        }
        return "EASY";
    }

    private String healthStatus(Double score) {
        if (score == null) {
            return null;
        }
        if (score >= BATCH_HEALTH_GOOD_THRESHOLD_PCT) {
            return "GOOD";
        }
        if (score >= BATCH_HEALTH_AVERAGE_THRESHOLD_PCT) {
            return "AVERAGE";
        }
        return "POOR";
    }

    private String readinessStatus(Double score) {
        if (score == null) {
            return "NOT_READY";
        }
        if (score >= READINESS_READY_THRESHOLD_PCT) {
            return "READY";
        }
        if (score >= READINESS_NEARLY_READY_THRESHOLD_PCT) {
            return "NEARLY_READY";
        }
        if (score >= READINESS_NEEDS_IMPROVEMENT_THRESHOLD_PCT) {
            return "NEEDS_IMPROVEMENT";
        }
        return "NOT_READY";
    }

    private BatchHealthResponse toBatchHealth(Batch batch) {
        List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        List<Assignment> assignments = assignmentRepository.findByBatchIdAndStatusInOrderByDueDateAsc(
                batch.getId(), List.of(AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED));
        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        List<AssignmentSubmission> submissions = assignmentIds.isEmpty()
                ? List.of()
                : submissionRepository.findByAssignmentIdIn(assignmentIds);

        long possible = (long) students.size() * assignments.size();
        Double completionPct = possible > 0 ? round1(submissions.size() * 100.0 / possible) : null;
        Double avgScorePct = averageScorePct(submissions);
        Double performancePct = blend(completionPct, avgScorePct);

        Map<Long, List<QuizAttempt>> quizByStudent = quizAttemptsByStudent(studentIds);
        Double quizAvg = average(studentIds.stream()
                .map(id -> avgQuizAccuracy(quizByStudent.getOrDefault(id, List.of())))
                .toList());

        Map<Long, List<Attendance>> attendanceByStudent = attendanceByStudent(studentIds);
        Double attendancePct = average(studentIds.stream()
                .map(id -> attendancePctFrom(attendanceByStudent.getOrDefault(id, List.of())))
                .toList());

        long placed = students.stream().filter(s -> s.getPlacementStatus() == PlacementStatus.PLACED).count();
        Double placementRate = students.isEmpty() ? null : round1(placed * 100.0 / students.size());

        Double healthScore = average(Arrays.asList(completionPct, avgScorePct, quizAvg, placementRate));

        return new BatchHealthResponse(batch.getId(), batch.getName(), attendancePct, performancePct, completionPct,
                quizAvg, placementRate, healthScore, healthStatus(healthScore));
    }

    private List<Map<String, Object>> exportStudents(Long batchId) {
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();
        return students.stream()
                .map(s -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("name", s.getUser() != null ? s.getUser().getName() : "Student #" + s.getId());
                    row.put("email", s.getUser() != null ? s.getUser().getEmail() : "");
                    row.put("enrollmentNo", s.getEnrollmentNo() != null ? s.getEnrollmentNo() : "");
                    row.put("batch", getStudentBatchNames(s));
                    row.put("course", s.getCourse() != null ? s.getCourse().getTitle() : "");
                    row.put("college", s.getCollege() != null ? s.getCollege().getName() : "");
                    row.put("placementStatus", s.getPlacementStatus() != null ? s.getPlacementStatus().name() : "SEEKING");
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> exportPerformance(Long batchId) {
        PerformanceReportRequest request = new PerformanceReportRequest();
        request.setBatchId(batchId);
        return getPerformanceReport(request).students().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("name", row.studentName() != null ? row.studentName() : "");
                    map.put("assignmentsSubmitted", row.assignmentsSubmitted());
                    map.put("avgGradePct", row.avgGrade() != null ? row.avgGrade() : 0.0);
                    map.put("avgQuizScorePct", row.avgQuizScore() != null ? row.avgQuizScore() : 0.0);
                    map.put("attendancePct", row.attendancePct() != null ? row.attendancePct() : 0.0);
                    map.put("riskLevel", row.riskLevel() != null ? row.riskLevel() : "NONE");
                    return map;
                })
                .toList();
    }

    private List<Map<String, Object>> exportAttendance(Long batchId) {
        List<Student> students = batchId != null ? enrollmentRepository.findActiveStudentsByBatchId(batchId) : studentRepository.findAll();
        return students.stream()
                .map(s -> {
                    List<Attendance> attendances = attendanceRepository.findByStudentId(s.getId());
                    long present = attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                    long absent = attendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
                    long late = attendances.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();
                    int total = attendances.size();
                    double pct = total > 0 ? round1(present * 100.0 / total) : 0.0;

                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("name", s.getUser() != null ? s.getUser().getName() : "Student #" + s.getId());
                    row.put("email", s.getUser() != null ? s.getUser().getEmail() : "");
                    row.put("enrollmentNo", s.getEnrollmentNo() != null ? s.getEnrollmentNo() : "");
                    row.put("batch", getStudentBatchNames(s));
                    row.put("present", present);
                    row.put("absent", absent);
                    row.put("late", late);
                    row.put("total", total);
                    row.put("attendancePct", pct);
                    return row;
                })
                .toList();
    }

    private ReportStudentResponse toStudentRow(Student student, List<AssignmentSubmission> submissions,
                                                List<QuizAttempt> quizAttempts, List<Attendance> attendances) {
        Double avgGrade = averageScorePct(submissions);
        Double completionPct = completionPctForStudent(student, submissions.size());
        Double quizPct = avgQuizAccuracy(quizAttempts);

        long presentCount = attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
        long absentCount = attendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
        Double attPct = attendances.isEmpty() ? null : round1(presentCount * 100.0 / attendances.size());

        Integer risk = riskScore(completionPct, avgGrade, quizPct);
        return new ReportStudentResponse(
                student.getId(),
                student.getUser().getName(),
                getStudentBatchNames(student),
                attPct,
                quizPct,
                submissions.size(),
                avgGrade,
                completionPct,
                blend(completionPct, avgGrade),
                null,
                List.of(),
                List.of(),
                risk,
                riskLevel(risk),
                List.of(),
                attendances.isEmpty() ? null : (int) presentCount,
                attendances.isEmpty() ? null : (int) absentCount);
    }

    private PerformanceReportResponse.CourseBreakdown toCourseBreakdown(
            Course course, List<Assignment> assignments, Map<Long, List<AssignmentSubmission>> submissionsByAssignmentId) {
        List<AssignmentSubmission> submissions = assignments.stream()
                .flatMap(a -> submissionsByAssignmentId.getOrDefault(a.getId(), List.of()).stream())
                .toList();

        Double avg = averageScorePct(submissions);
        long graded = submissions.stream().filter(s -> s.getMarks() != null).count();
        long passed = submissions.stream()
                .filter(s -> s.getMarks() != null && s.getAssignment().getTotalMarks() > 0
                        && (s.getMarks() * 100.0 / s.getAssignment().getTotalMarks()) >= LOW_SCORE_THRESHOLD_PCT)
                .count();
        Double passRate = graded > 0 ? round1(passed * 100.0 / graded) : null;

        return new PerformanceReportResponse.CourseBreakdown(
                course.getId(), course.getTitle(), avg, assignments.size(), submissions.size(), passRate, difficultyStatus(avg));
    }

    private PerformanceReportResponse.BatchBreakdown toBatchBreakdown(
            Batch batch, List<Student> students, List<Assignment> assignments,
            Map<Long, List<AssignmentSubmission>> submissionsByAssignmentId) {
        List<AssignmentSubmission> submissions = assignments.stream()
                .flatMap(a -> submissionsByAssignmentId.getOrDefault(a.getId(), List.of()).stream())
                .toList();

        long possible = (long) students.size() * assignments.size();
        Double completionPct = possible > 0 ? round1(submissions.size() * 100.0 / possible) : null;
        Double avgScorePct = averageScorePct(submissions);

        return new PerformanceReportResponse.BatchBreakdown(
                batch.getId(), batch.getName(), students.size(), completionPct, avgScorePct, blend(completionPct, avgScorePct));
    }

    private PlacementReportResponse.BatchPlacement toBatchPlacement(Batch batch, List<Student> students) {
        long placed = students.stream().filter(s -> s.getPlacementStatus() == PlacementStatus.PLACED).count();
        double rate = students.isEmpty() ? 0.0 : round1(placed * 100.0 / students.size());
        return new PlacementReportResponse.BatchPlacement(batch.getId(), batch.getName(), students.size(), placed, rate);
    }

    private PlacementReportResponse.CoursePlacement toCoursePlacement(Course course, List<Student> students) {
        long placed = students.stream().filter(s -> s.getPlacementStatus() == PlacementStatus.PLACED).count();
        double rate = students.isEmpty() ? 0.0 : round1(placed * 100.0 / students.size());
        return new PlacementReportResponse.CoursePlacement(course.getId(), course.getTitle(), students.size(), placed, rate);
    }

    /** Groups graded submissions by ISO week of submittedAt and averages the score% within each week. */
    private Map<String, List<AssignmentSubmission>> groupByWeek(List<AssignmentSubmission> submissions) {
        WeekFields weekFields = WeekFields.ISO;
        return submissions.stream()
                .filter(s -> s.getMarks() != null && s.getAssignment().getTotalMarks() > 0 && s.getSubmittedAt() != null)
                .collect(Collectors.groupingBy(
                        s -> {
                            LocalDate date = s.getSubmittedAt().atZone(ZoneOffset.UTC).toLocalDate();
                            int year = date.get(weekFields.weekBasedYear());
                            int week = date.get(weekFields.weekOfWeekBasedYear());
                            return "%d-W%02d".formatted(year, week);
                        },
                        TreeMap::new,
                        Collectors.toList()));
    }

    private List<PerformanceReportResponse.TrendPoint> computeTrend(List<AssignmentSubmission> submissions) {
        return groupByWeek(submissions).entrySet().stream()
                .map(entry -> new PerformanceReportResponse.TrendPoint(entry.getKey(), averageScorePct(entry.getValue())))
                .toList();
    }

    private List<TrendPointResponse> weeklyTrend(List<AssignmentSubmission> submissions) {
        return groupByWeek(submissions).entrySet().stream()
                .map(entry -> new TrendPointResponse(entry.getKey(), averageScorePct(entry.getValue())))
                .toList();
    }

    private List<PerformanceReportResponse.AtRiskBreakdown> computeAtRiskBreakdown(List<Student> students,
                                                                                     Map<Long, List<AssignmentSubmission>> byStudent,
                                                                                     Map<Long, List<QuizAttempt>> quizByStudent) {
        long lowCompletion = 0;
        long lowScore = 0;
        long lowQuiz = 0;
        for (Student student : students) {
            List<AssignmentSubmission> submissions = byStudent.getOrDefault(student.getId(), List.of());
            Double completionPct = completionPctForStudent(student, submissions.size());
            Double avgScorePct = averageScorePct(submissions);
            Double quizPct = avgQuizAccuracy(quizByStudent.getOrDefault(student.getId(), List.of()));
            if (completionPct != null && completionPct < LOW_COMPLETION_THRESHOLD_PCT) {
                lowCompletion++;
            }
            if (avgScorePct != null && avgScorePct < LOW_SCORE_THRESHOLD_PCT) {
                lowScore++;
            }
            if (quizPct != null && quizPct < LOW_SCORE_THRESHOLD_PCT) {
                lowQuiz++;
            }
        }
        return List.of(
                new PerformanceReportResponse.AtRiskBreakdown(REASON_LOW_COMPLETION, lowCompletion),
                new PerformanceReportResponse.AtRiskBreakdown(REASON_LOW_SCORE, lowScore),
                new PerformanceReportResponse.AtRiskBreakdown(REASON_LOW_QUIZ, lowQuiz));
    }

    private List<String> reasonsFor(Double completionPct, Double avgScorePct, Double quizPct) {
        List<String> reasons = new ArrayList<>();
        if (completionPct != null && completionPct < LOW_COMPLETION_THRESHOLD_PCT) {
            reasons.add(REASON_LOW_COMPLETION);
        }
        if (avgScorePct != null && avgScorePct < LOW_SCORE_THRESHOLD_PCT) {
            reasons.add(REASON_LOW_SCORE);
        }
        if (quizPct != null && quizPct < LOW_SCORE_THRESHOLD_PCT) {
            reasons.add(REASON_LOW_QUIZ);
        }
        return reasons;
    }

    private ReportSummaryResponse summarize(List<ReportStudentResponse> rows) {
        Double avgScore = average(rows.stream().map(ReportStudentResponse::avgGrade).toList());
        Double avgCompletion = average(rows.stream().map(ReportStudentResponse::assignmentCompletionPct).toList());
        Double avgQuiz = average(rows.stream().map(ReportStudentResponse::avgQuizScore).toList());
        return new ReportSummaryResponse(rows.size(), avgScore, avgCompletion, blend(avgCompletion, avgScore), avgQuiz);
    }

    private Double average(List<Double> values) {
        List<Double> present = values.stream().filter(v -> v != null).toList();
        if (present.isEmpty()) {
            return null;
        }
        return round1(present.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
    }

    private Double completionPctForStudent(Student student, int submittedCount) {
        List<Batch> activeBatches = enrollmentRepository.findActiveBatchesByStudentId(student.getId());
        if (activeBatches.isEmpty()) {
            return null;
        }
        List<Long> batchIds = activeBatches.stream().map(Batch::getId).toList();
        long assignmentCount = assignmentRepository.findByBatchIdInAndStatusInOrderByDueDateAsc(
                batchIds, List.of(AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED)).size();
        return assignmentCount > 0 ? Math.min(100.0, round1(submittedCount * 100.0 / assignmentCount)) : null;
    }

    private Double attendancePctForStudent(Long studentId) {
        return attendancePctFrom(attendanceRepository.findByStudentId(studentId));
    }

    private Double attendancePctFrom(List<Attendance> attendances) {
        if (attendances.isEmpty()) {
            return null;
        }
        long present = attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
        return round1(present * 100.0 / attendances.size());
    }

    private Double averageScorePct(List<AssignmentSubmission> submissions) {
        List<Double> scores = submissions.stream()
                .filter(s -> s.getMarks() != null && s.getAssignment().getTotalMarks() > 0)
                .map(s -> s.getMarks() * 100.0 / s.getAssignment().getTotalMarks())
                .toList();
        if (scores.isEmpty()) {
            return null;
        }
        return round1(scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
    }

    private Double blend(Double a, Double b) {
        if (a == null && b == null) {
            return null;
        }
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return round1((a + b) / 2.0);
    }

    private String monthKey(Instant instant) {
        LocalDate date = instant.atZone(ZoneOffset.UTC).toLocalDate();
        return "%d-%02d".formatted(date.getYear(), date.getMonthValue());
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private Student findStudentOrThrow(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));
    }

    private Batch findBatchOrThrow(Long batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
    }
}
