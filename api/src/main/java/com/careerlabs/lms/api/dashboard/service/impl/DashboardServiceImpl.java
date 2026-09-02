package com.careerlabs.lms.api.dashboard.service.impl;

import com.careerlabs.lms.api.assignment.dto.response.StudentAssignmentResponse;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.assignment.service.AssignmentService;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceAnalyticsService;
import com.careerlabs.lms.api.attendance.service.AttendanceRiskService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.dashboard.dto.response.AdminDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.StudentDashboardResponse;
import com.careerlabs.lms.api.dashboard.service.DashboardService;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveResponse;
import com.careerlabs.lms.api.placement.dto.response.StudentDriveResponse;
import com.careerlabs.lms.api.placement.entity.DriveStatus;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.service.DriveService;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.AchievementService;
import com.careerlabs.lms.api.quiz.service.DailyChallengeService;
import com.careerlabs.lms.api.quiz.service.GamificationService;
import com.careerlabs.lms.api.quiz.service.LeaderboardService;
import com.careerlabs.lms.api.quiz.service.QuizAnalyticsService;
import com.careerlabs.lms.api.quiz.service.QuizService;
import com.careerlabs.lms.api.quiz.service.WeakAreaService;
import com.careerlabs.lms.api.report.dto.request.PerformanceReportRequest;
import com.careerlabs.lms.api.report.dto.response.OverviewResponse;
import com.careerlabs.lms.api.report.dto.response.PerformanceReportResponse;
import com.careerlabs.lms.api.report.dto.response.ReportStudentResponse;
import com.careerlabs.lms.api.report.service.ReportService;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class DashboardServiceImpl implements DashboardService {

    private static final int UPCOMING_WINDOW_DAYS = 7;
    private static final int ACTIVITY_FEED_SIZE = 8;

    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final DailyClassRepository dailyClassRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SyllabusModuleRepository syllabusModuleRepository;
    private final SyllabusTopicRepository syllabusTopicRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    private final ReportService reportService;
    private final AttendanceAnalyticsService attendanceAnalyticsService;
    private final AttendanceRiskService attendanceRiskService;
    private final GamificationService gamificationService;
    private final LeaderboardService leaderboardService;
    private final DailyChallengeService dailyChallengeService;
    private final WeakAreaService weakAreaService;
    private final AchievementService achievementService;
    private final QuizService quizService;
    private final QuizAnalyticsService quizAnalyticsService;
    private final AssignmentService assignmentService;
    private final DriveService driveService;

    public DashboardServiceImpl(
            StudentRepository studentRepository,
            CourseRepository courseRepository,
            AssignmentRepository assignmentRepository,
            AssignmentSubmissionRepository assignmentSubmissionRepository,
            QuizRepository quizRepository,
            QuizAttemptRepository quizAttemptRepository,
            DriveApplicationRepository driveApplicationRepository,
            DailyClassRepository dailyClassRepository,
            EnrollmentRepository enrollmentRepository,
            SyllabusModuleRepository syllabusModuleRepository,
            SyllabusTopicRepository syllabusTopicRepository,
            SessionRepository sessionRepository,
            UserRepository userRepository,
            ReportService reportService,
            AttendanceAnalyticsService attendanceAnalyticsService,
            AttendanceRiskService attendanceRiskService,
            GamificationService gamificationService,
            LeaderboardService leaderboardService,
            DailyChallengeService dailyChallengeService,
            WeakAreaService weakAreaService,
            AchievementService achievementService,
            QuizService quizService,
            QuizAnalyticsService quizAnalyticsService,
            AssignmentService assignmentService,
            DriveService driveService) {
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.assignmentRepository = assignmentRepository;
        this.assignmentSubmissionRepository = assignmentSubmissionRepository;
        this.quizRepository = quizRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.syllabusModuleRepository = syllabusModuleRepository;
        this.syllabusTopicRepository = syllabusTopicRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.reportService = reportService;
        this.attendanceAnalyticsService = attendanceAnalyticsService;
        this.attendanceRiskService = attendanceRiskService;
        this.gamificationService = gamificationService;
        this.leaderboardService = leaderboardService;
        this.dailyChallengeService = dailyChallengeService;
        this.weakAreaService = weakAreaService;
        this.achievementService = achievementService;
        this.quizService = quizService;
        this.quizAnalyticsService = quizAnalyticsService;
        this.assignmentService = assignmentService;
        this.driveService = driveService;
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse getAdminDashboard() {
        // The full performance report is expensive to compute (course/batch/student
        // breakdowns) - compute it once and reuse it for both the overview stats and
        // the performance widget below, instead of the dashboard triggering it twice.
        PerformanceReportResponse performance = reportService.getPerformanceReport(new PerformanceReportRequest());
        OverviewResponse overview = reportService.getOverview(performance);
        List<AdminDriveResponse> drives = driveService.listForAdmin();
        return new AdminDashboardResponse(
                buildAdminOverview(overview, drives),
                buildAdminPerformance(overview, performance),
                buildAdminAttendance(),
                buildAdminAssignments(),
                buildAdminQuizzes(),
                buildAdminPlacement(drives),
                buildUpcomingSessions(),
                buildRecentActivity());
    }

    private AdminDashboardResponse.Overview buildAdminOverview(OverviewResponse overview, List<AdminDriveResponse> drives) {
        return new AdminDashboardResponse.Overview(
                studentRepository.count(),
                studentRepository.countByUser_ActiveTrue(),
                courseRepository.count(),
                overview.activeBatches(),
                assignmentRepository.count(),
                quizRepository.count(),
                drives.size());
    }

    private AdminDashboardResponse.Performance buildAdminPerformance(OverviewResponse overview, PerformanceReportResponse performance) {
        long needsImprovement = performance.students().stream()
                .filter(s -> "MEDIUM".equals(s.riskLevel()))
                .count();
        return new AdminDashboardResponse.Performance(
                overview.averagePerformancePct(),
                performance.performanceTrend(),
                overview.atRiskStudentCount(),
                needsImprovement);
    }

    private AdminDashboardResponse.Attendance buildAdminAttendance() {
        var cc = attendanceAnalyticsService.getCommandCenter();
        int atRisk = cc.below75Count() - cc.criticalCount();
        int healthy = cc.totalStudents() - cc.below75Count();
        return new AdminDashboardResponse.Attendance(
                Math.max(healthy, 0),
                Math.max(atRisk, 0),
                cc.criticalCount(),
                cc.averageAttendance());
    }

    private AdminDashboardResponse.Assignments buildAdminAssignments() {
        return new AdminDashboardResponse.Assignments(
                assignmentRepository.countByStatus(AssignmentStatus.PUBLISHED),
                assignmentSubmissionRepository.countByReviewedFalse(),
                assignmentSubmissionRepository.countByLateTrue(),
                assignmentSubmissionRepository.countByReviewedTrue());
    }

    private AdminDashboardResponse.Quizzes buildAdminQuizzes() {
        var quizAnalytics = reportService.getQuizAnalytics(null, null);
        return new AdminDashboardResponse.Quizzes(
                quizRepository.count(),
                quizAttemptRepository.countByStatus(AttemptStatus.SUBMITTED),
                quizAnalytics.averageScorePct(),
                quizAnalytics.passRatePct());
    }

    private AdminDashboardResponse.Placement buildAdminPlacement(List<AdminDriveResponse> drives) {
        long activeDrives = drives.stream().filter(d -> d.status() == DriveStatus.ACTIVE).count();
        long availableDrives = drives.stream()
                .filter(d -> d.status() == DriveStatus.ACTIVE || d.status() == DriveStatus.UPCOMING)
                .count();
        long interestedStudents = driveApplicationRepository.countDistinctStudents();
        return new AdminDashboardResponse.Placement(activeDrives, interestedStudents, availableDrives);
    }

    private List<AdminDashboardResponse.UpcomingSession> buildUpcomingSessions() {
        LocalDateTime now = LocalDateTime.now();
        return dailyClassRepository.findByDateBetweenOrderByDateAsc(now, now.plusDays(UPCOMING_WINDOW_DAYS)).stream()
                .limit(10)
                .map(c -> new AdminDashboardResponse.UpcomingSession(
                        c.getId(), c.getBatch().getName(), c.getTitle(), c.getDate(), c.getMeetLink()))
                .toList();
    }

    private List<AdminDashboardResponse.ActivityItem> buildRecentActivity() {
        Stream<AdminDashboardResponse.ActivityItem> newStudents = studentRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(s -> new AdminDashboardResponse.ActivityItem(
                        "NEW_STUDENT", s.getUser().getName() + " joined", s.getCreatedAt()));

        Stream<AdminDashboardResponse.ActivityItem> submissions = assignmentSubmissionRepository.findTop10ByOrderBySubmittedAtDesc().stream()
                .map(sub -> new AdminDashboardResponse.ActivityItem(
                        "SUBMISSION",
                        sub.getStudent().getUser().getName() + " submitted " + sub.getAssignment().getTitle(),
                        sub.getSubmittedAt()));

        List<QuizAttempt> recentAttempts = quizAttemptRepository.findTop10ByStatusOrderByCompletedAtDesc(AttemptStatus.SUBMITTED);
        // QuizAttempt.studentId actually stores the User id (see class-level note in GamificationService),
        // not a Student.id - resolve names via UserRepository accordingly, same as LeaderboardServiceImpl does.
        Map<Long, String> namesByUserId = userRepository.findAllById(
                        recentAttempts.stream().map(QuizAttempt::getStudentId).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        Stream<AdminDashboardResponse.ActivityItem> quizAttempts = recentAttempts.stream()
                .filter(a -> a.getCompletedAt() != null)
                .map(a -> new AdminDashboardResponse.ActivityItem(
                        "QUIZ_ATTEMPT",
                        namesByUserId.getOrDefault(a.getStudentId(), "Student") + " attempted " + a.getQuiz().getTitle(),
                        a.getCompletedAt()));

        return Stream.of(newStudents, submissions, quizAttempts)
                .flatMap(s -> s)
                .sorted(Comparator.comparing(AdminDashboardResponse.ActivityItem::time).reversed())
                .limit(ACTIVITY_FEED_SIZE)
                .toList();
    }

    // ─── Student ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public StudentDashboardResponse getStudentDashboard(Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));

        ReportStudentResponse performance = reportService.getStudentPerformance(student.getId());
        var quizAnalytics = quizAnalyticsService.getAnalytics(userId);
        var attendanceHealth = attendanceRiskService.getHealth(userId);
        StudentGameStats stats = gamificationService.getOrCreateStats(userId);
        List<StudentAssignmentResponse> assignments = assignmentService.listForStudent(userId);
        List<StudentAssignmentResponse> pendingAssignments = assignments.stream()
                .filter(a -> a.submission() == null)
                .sorted(Comparator.comparing(StudentAssignmentResponse::dueDate))
                .toList();

        List<Enrollment> enrollments = enrollmentRepository.findAllByStudentIdOrderByEnrolledAtDesc(student.getId());
        List<StudentDashboardResponse.UpcomingClass> upcomingClasses = buildUpcomingClasses(student);

        return new StudentDashboardResponse(
                buildStudentOverview(enrollments, performance, attendanceHealth, pendingAssignments, quizAnalytics, stats),
                buildContinueLearning(enrollments),
                buildTodaysTasks(userId, pendingAssignments, upcomingClasses),
                new StudentDashboardResponse.Performance(quizAnalytics, performance),
                new StudentDashboardResponse.Attendance(
                        attendanceHealth.currentPercentage(),
                        attendanceHealth.previousPercentage(),
                        attendanceHealth.improvement(),
                        attendanceHealth.riskLevel().name()),
                buildGamification(userId, stats),
                buildStudentPlacement(student, userId),
                upcomingClasses);
    }

    private StudentDashboardResponse.Overview buildStudentOverview(
            List<Enrollment> enrollments,
            ReportStudentResponse performance,
            com.careerlabs.lms.api.attendance.dto.response.AttendanceHealthResponse attendanceHealth,
            List<StudentAssignmentResponse> pendingAssignments,
            com.careerlabs.lms.api.quiz.dto.response.QuizAnalyticsResponse quizAnalytics,
            StudentGameStats stats) {
        return new StudentDashboardResponse.Overview(
                enrollments.size(),
                performance.assignmentCompletionPct(),
                attendanceHealth.currentPercentage(),
                pendingAssignments.size(),
                quizAnalytics.overallSkill(),
                stats.getTotalXp(),
                stats.getCurrentStreak());
    }

    private List<StudentDashboardResponse.ContinueLearningItem> buildContinueLearning(List<Enrollment> enrollments) {
        if (enrollments.isEmpty()) {
            return List.of();
        }

        List<Long> courseIds = enrollments.stream().map(e -> e.getCourse().getId()).distinct().toList();

        Map<Long, SyllabusModule> firstModuleByCourseId = syllabusModuleRepository
                .findAllByCourseIdInOrderByOrderIndexAsc(courseIds).stream()
                .collect(Collectors.toMap(m -> m.getCourse().getId(), m -> m, (a, b) -> a));

        List<Long> firstModuleIds = firstModuleByCourseId.values().stream().map(SyllabusModule::getId).distinct().toList();
        Map<Long, SyllabusTopic> firstTopicByModuleId = firstModuleIds.isEmpty()
                ? Map.of()
                : syllabusTopicRepository.findAllByModuleIdInOrderByOrderIndexAsc(firstModuleIds).stream()
                        .collect(Collectors.toMap(t -> t.getModule().getId(), t -> t, (a, b) -> a));

        List<Long> firstTopicIds = firstTopicByModuleId.values().stream().map(SyllabusTopic::getId).distinct().toList();
        Map<Long, Session> firstSessionByTopicId = firstTopicIds.isEmpty()
                ? Map.of()
                : sessionRepository.findAllByTopicIdInOrderByOrderIndexAsc(firstTopicIds).stream()
                        .collect(Collectors.toMap(s -> s.getTopic().getId(), s -> s, (a, b) -> a));

        return enrollments.stream()
                .map(e -> {
                    Long courseId = e.getCourse().getId();
                    SyllabusModule firstModule = firstModuleByCourseId.get(courseId);
                    SyllabusTopic firstTopic = firstModule == null ? null : firstTopicByModuleId.get(firstModule.getId());
                    Session firstSession = firstTopic == null ? null : firstSessionByTopicId.get(firstTopic.getId());
                    return new StudentDashboardResponse.ContinueLearningItem(
                            courseId,
                            e.getCourse().getTitle(),
                            firstModule == null ? null : firstModule.getTitle(),
                            firstTopic == null ? null : firstTopic.getTitle(),
                            firstSession == null ? null : firstSession.getTitle(),
                            firstSession == null ? null : firstSession.getId());
                })
                .toList();
    }

    private StudentDashboardResponse.TodaysTasks buildTodaysTasks(
            Long userId, List<StudentAssignmentResponse> pendingAssignments,
            List<StudentDashboardResponse.UpcomingClass> upcomingClasses) {
        List<com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse> availableQuizzes = quizService.listPublished(userId).stream()
                .filter(q -> q.maxAttempts() == null || q.attemptsUsed() < q.maxAttempts())
                .limit(5)
                .toList();
        List<StudentDashboardResponse.UpcomingClass> upcomingSessions = upcomingClasses.stream()
                .limit(5)
                .toList();
        return new StudentDashboardResponse.TodaysTasks(
                pendingAssignments.stream().limit(5).toList(),
                availableQuizzes,
                upcomingSessions);
    }

    private StudentDashboardResponse.Gamification buildGamification(Long userId, StudentGameStats stats) {
        return new StudentDashboardResponse.Gamification(
                stats.getTotalXp(),
                stats.getCurrentStreak(),
                stats.getLongestStreak(),
                achievementService.listMine(userId),
                dailyChallengeService.getToday(userId),
                leaderboardService.getLeaderboard("GLOBAL", userId),
                weakAreaService.getWeakAreas(userId));
    }

    private StudentDashboardResponse.Placement buildStudentPlacement(Student student, Long userId) {
        List<StudentDriveResponse> drives = driveService.listForStudent(userId);
        long availableDrives = drives.stream()
                .filter(d -> d.status() == DriveStatus.ACTIVE || d.status() == DriveStatus.UPCOMING)
                .count();
        long interestExpressed = driveApplicationRepository.findAllByStudent_IdOrderByCreatedAtDesc(student.getId()).size();
        return new StudentDashboardResponse.Placement(
                student.getPlacementStatus().name(), availableDrives, interestExpressed);
    }

    private List<StudentDashboardResponse.UpcomingClass> buildUpcomingClasses(Student student) {
        if (student.getBatch() == null) {
            return List.of();
        }
        LocalDateTime now = LocalDateTime.now();
        List<DailyClass> classes = dailyClassRepository.findByBatchIdAndDateBetweenOrderByDateAsc(
                student.getBatch().getId(), now, now.plusDays(UPCOMING_WINDOW_DAYS));
        return classes.stream()
                .map(c -> new StudentDashboardResponse.UpcomingClass(
                        c.getId(), c.getBatch().getName(), c.getTitle(), c.getDate(), c.getMeetLink()))
                .toList();
    }
}
