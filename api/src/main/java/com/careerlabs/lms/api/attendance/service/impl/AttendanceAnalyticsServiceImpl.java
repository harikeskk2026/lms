package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceCommandCenterResponse;
import com.careerlabs.lms.api.attendance.dto.response.TodayClassResponse;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.entity.RiskLevel;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceAnalyticsService;
import com.careerlabs.lms.api.attendance.service.AttendancePolicyService;
import com.careerlabs.lms.api.attendance.service.AttendanceRiskService;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceAnalyticsServiceImpl implements AttendanceAnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceAnalyticsServiceImpl.class);

    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final DailyClassRepository dailyClassRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendancePolicyService attendancePolicyService;
    private final AttendanceRiskService attendanceRiskService;
    private final MeetingLinkRepository meetingLinkRepository;
    private final UserRepository userRepository;

    public AttendanceAnalyticsServiceImpl(
            BatchRepository batchRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            DailyClassRepository dailyClassRepository,
            AttendanceRepository attendanceRepository,
            AttendancePolicyService attendancePolicyService,
            AttendanceRiskService attendanceRiskService,
            MeetingLinkRepository meetingLinkRepository,
            UserRepository userRepository) {
        this.batchRepository = batchRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendancePolicyService = attendancePolicyService;
        this.attendanceRiskService = attendanceRiskService;
        this.meetingLinkRepository = meetingLinkRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceCommandCenterResponse getCommandCenter() {
        List<Batch> activeBatches = batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(Batch::isActive)
                .toList();

        int below75Count = 0;
        int criticalCount = 0;
        int totalPresentCount = 0;
        int totalMarkedCount = 0;
        double totalStudentPctSum = 0;
        int totalBatchStudents = 0; // all students across active batches

        for (Batch batch : activeBatches) {
            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            if (students.isEmpty()) continue;

            totalBatchStudents += students.size();
            List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batch.getId());
            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));
            AttendancePolicy policy = attendancePolicyService.getEffectivePolicy(batch.getId());

            for (Student student : students) {
                List<Attendance> studentAttendance = byStudent.getOrDefault(student.getId(), List.of());
                int total = studentAttendance.size();

                // Students with NO attendance records yet are NOT classified — skip risk/below75
                if (total == 0) {
                    continue;
                }

                int present = (int) studentAttendance.stream()
                        .filter(a -> a.getStatus() == AttendStatus.PRESENT)
                        .count();
                double pct = (present * 100.0) / total;

                totalStudentPctSum += pct;
                totalPresentCount += present;
                totalMarkedCount += total;

                if (pct < policy.getHealthyThreshold()) {
                    below75Count++;
                }
                if (attendanceRiskService.classify((int) Math.round(pct), policy) == RiskLevel.CRITICAL) {
                    criticalCount++;
                }
            }
        }

        // Healthy = batch-enrolled students who have records and are above threshold
        int totalStudents = (int) studentRepository.count();

        // Average = sum of each tracked student's pct / students who have records
        int studentsWithRecords = totalBatchStudents; // used for display; tracking is done per-student above
        int averageAttendance = totalMarkedCount > 0
                ? (int) Math.round((totalPresentCount * 100.0) / totalMarkedCount)
                : 0;

        int todaysClasses = getTodayClasses(LocalDate.now()).size();
        int unmarkedClasses = (int) dailyClassRepository.countByStatusAndDateLessThanEqual(ClassStatus.SCHEDULED, LocalDateTime.now());

        return new AttendanceCommandCenterResponse(totalStudents, todaysClasses, averageAttendance, below75Count, criticalCount, unmarkedClasses);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceCommandCenterResponse getCommandCenterForBatches(List<Long> batchIds) {
        if (batchIds == null || batchIds.isEmpty()) {
            return new AttendanceCommandCenterResponse(0, 0, 0, 0, 0, 0);
        }
        List<Batch> activeBatches = batchRepository.findAllById(batchIds).stream()
                .filter(Batch::isActive)
                .toList();

        int totalStudents = 0;
        int below75Count = 0;
        int criticalCount = 0;
        double totalStudentPctSum = 0;
        int totalPresentCount = 0;
        int totalMarkedCount = 0;

        for (Batch batch : activeBatches) {
            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            totalStudents += students.size();
            if (students.isEmpty()) continue;

            List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batch.getId());
            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));
            AttendancePolicy policy = attendancePolicyService.getEffectivePolicy(batch.getId());

            for (Student student : students) {
                List<Attendance> studentAttendance = byStudent.getOrDefault(student.getId(), List.of());
                int total = studentAttendance.size();

                // Students with NO records contribute 0% to the average
                int present = total > 0
                        ? (int) studentAttendance.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count()
                        : 0;
                double pct = total > 0 ? (present * 100.0) / total : 0.0;

                totalStudentPctSum += pct;
                if (total > 0) {
                    totalPresentCount += present;
                    totalMarkedCount += total;
                }

                if (pct < policy.getHealthyThreshold()) {
                    below75Count++;
                }
                if (attendanceRiskService.classify((int) Math.round(pct), policy) == RiskLevel.CRITICAL) {
                    criticalCount++;
                }
            }
        }

        // Average = sum of each student's pct / total batch students (includes 0% for unmarked)
        int averageAttendance = totalStudents > 0
                ? (int) Math.round(totalStudentPctSum / totalStudents)
                : 0;

        List<TodayClassResponse> todayClasses = getTodayClasses(LocalDate.now());
        int todaysClasses = (int) todayClasses.stream()
                .filter(c -> c.batchId() != null && batchIds.contains(c.batchId()))
                .count();
        int unmarkedClasses = (int) dailyClassRepository.countByStatusAndDateLessThanEqual(ClassStatus.SCHEDULED, LocalDateTime.now());

        return new AttendanceCommandCenterResponse(totalStudents, todaysClasses, averageAttendance, below75Count, criticalCount, unmarkedClasses);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TodayClassResponse> getTodayClasses() {
        return getTodayClasses(null);
    }

    @Override
    @Transactional
    public List<TodayClassResponse> getTodayClasses(LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<DailyClass> classes = new ArrayList<>(dailyClassRepository.findByDateBetweenOrderByDateAsc(startOfDay, endOfDay));
        List<MeetingLink> scheduledMeetings = new ArrayList<>(meetingLinkRepository.findActiveMeetingsForDate(startOfDay, endOfDay));

        // Also ensure any meetings for batches have their DailyClasses created & linked
        for (MeetingLink m : scheduledMeetings) {
            if (m.getDailyClass() == null && m.getBatch() != null) {
                try {
                    DailyClass dc = new DailyClass();
                    dc.setBatch(m.getBatch());
                    dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
                    dc.setTitle(m.getTitle() != null && !m.getTitle().isBlank() ? m.getTitle() : "Scheduled Class");
                    dc.setMeetLink(m.getMeetUrl());
                    dc.setStatus(ClassStatus.SCHEDULED);
                    dc = dailyClassRepository.save(dc);
                    m.setDailyClass(dc);
                    meetingLinkRepository.save(m);
                } catch (Exception e) {
                    log.warn("Failed to auto-create daily class for meetingLinkId {}: {}", m.getId(), e.getMessage(), e);
                }
            }
        }

        // Also find DailyClasses linked to those meetings (so attendance can be marked)
        List<DailyClass> meetingLinkedClasses = scheduledMeetings.stream()
                .filter(m -> m.getDailyClass() != null)
                .map(MeetingLink::getDailyClass)
                .filter(cls -> !classes.contains(cls))
                .distinct()
                .toList();
        if (!meetingLinkedClasses.isEmpty()) {
            classes.addAll(meetingLinkedClasses);
        }

        List<MeetingLink> classLinkedMeetings = classes.isEmpty() ? List.of() : meetingLinkRepository.findByDailyClassIn(classes);

        // Merge all meetings for fast lookup
        List<MeetingLink> allMeetings = new ArrayList<>(scheduledMeetings);
        for (MeetingLink m : classLinkedMeetings) {
            if (!allMeetings.contains(m)) {
                allMeetings.add(m);
            }
        }

        List<Long> classIds = classes.stream().map(DailyClass::getId).toList();
        Map<Long, List<Attendance>> attendanceByClassId = classIds.isEmpty() ? Map.of() : attendanceRepository
                .findByDailyClassIdIn(classIds).stream()
                .collect(Collectors.groupingBy(a -> a.getDailyClass().getId()));

        List<Long> batchIds = new ArrayList<>();
        for (DailyClass cls : classes) {
            if (cls.getBatch() != null && !batchIds.contains(cls.getBatch().getId())) {
                batchIds.add(cls.getBatch().getId());
            }
        }
        for (MeetingLink m : allMeetings) {
            if (m.getBatch() != null && !batchIds.contains(m.getBatch().getId())) {
                batchIds.add(m.getBatch().getId());
            }
        }

        Map<Long, Integer> studentCountByBatchId = batchIds.isEmpty() ? Map.of() : enrollmentRepository
                .findByBatchIdInAndActiveTrue(batchIds).stream()
                .filter(e -> e.getBatch() != null)
                .collect(Collectors.groupingBy(e -> e.getBatch().getId(), Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

        Set<Long> trainerIds = new HashSet<>();
        for (DailyClass cls : classes) {
            if (cls.getBatch() != null && cls.getBatch().getTrainerId() != null) {
                trainerIds.add(cls.getBatch().getTrainerId());
            }
        }
        for (MeetingLink m : allMeetings) {
            if (m.getBatch() != null && m.getBatch().getTrainerId() != null) {
                trainerIds.add(m.getBatch().getTrainerId());
            }
        }
        Map<Long, String> trainerNameById = trainerIds.isEmpty() ? Map.of() : userRepository.findAllById(trainerIds).stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(User::getId, User::getName, (existing, replacement) -> existing));

        Map<Long, MeetingLink> meetingByDailyClassId = new java.util.HashMap<>();
        Map<String, MeetingLink> meetingByBatchAndTitle = new java.util.HashMap<>();
        Map<Long, MeetingLink> meetingByBatchId = new java.util.HashMap<>();
        for (MeetingLink m : allMeetings) {
            if (m.getDailyClass() != null) {
                meetingByDailyClassId.put(m.getDailyClass().getId(), m);
            }
            if (m.getBatch() != null) {
                String batchKey = m.getBatch().getId() + "|" + (m.getTitle() != null ? m.getTitle().trim().toLowerCase() : "");
                meetingByBatchAndTitle.put(batchKey, m);
                meetingByBatchId.putIfAbsent(m.getBatch().getId(), m);
            }
        }

        Set<String> seenKeys = new HashSet<>();
        Set<Long> renderedDailyClassIds = new HashSet<>();
        List<TodayClassResponse> result = new ArrayList<>();

        for (DailyClass cls : classes) {
            renderedDailyClassIds.add(cls.getId());
            String key = (cls.getBatch() != null ? cls.getBatch().getId() : "null")
                    + "|" + (cls.getTitle() != null ? cls.getTitle().trim().toLowerCase() : "")
                    + "|" + (cls.getDate() != null ? cls.getDate().toLocalDate() + "T" + cls.getDate().getHour() + ":" + cls.getDate().getMinute() : "");
            if (!seenKeys.add(key)) {
                continue;
            }

            List<Attendance> attendances = attendanceByClassId.getOrDefault(cls.getId(), List.of());
            int present = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
            int absent = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
            int totalStudents = cls.getBatch() != null ? studentCountByBatchId.getOrDefault(cls.getBatch().getId(), 0) : 0;

            String trainerName = null;
            String courseTitle = null;
            String mode = "ONLINE";
            String timing = null;

            if (cls.getBatch() != null) {
                if (cls.getBatch().getTrainerId() != null) {
                    trainerName = trainerNameById.get(cls.getBatch().getTrainerId());
                }
                if (cls.getBatch().getCourse() != null) {
                    courseTitle = cls.getBatch().getCourse().getTitle();
                }
                if (cls.getBatch().getMode() != null) {
                    mode = cls.getBatch().getMode().name();
                }
                timing = cls.getBatch().getTiming();
            }

            LocalDateTime classStartTime = cls.getDate();
            LocalDateTime classEndTime = null;

            MeetingLink linkedMeeting = meetingByDailyClassId.get(cls.getId());
            if (linkedMeeting == null && cls.getBatch() != null) {
                String batchKey = cls.getBatch().getId() + "|" + (cls.getTitle() != null ? cls.getTitle().trim().toLowerCase() : "");
                linkedMeeting = meetingByBatchAndTitle.get(batchKey);
                if (linkedMeeting == null) {
                    linkedMeeting = meetingByBatchId.get(cls.getBatch().getId());
                }
            }

            if (linkedMeeting != null) {
                if (linkedMeeting.getScheduledStart() != null) {
                    classStartTime = linkedMeeting.getScheduledStart();
                }
                classEndTime = linkedMeeting.getScheduledEnd();
                if (linkedMeeting.getHostName() != null && !linkedMeeting.getHostName().isBlank()) {
                    trainerName = linkedMeeting.getHostName();
                }
            }

            String meetLink = cls.getMeetLink();
            if ((meetLink == null || meetLink.isBlank()) && linkedMeeting != null) {
                meetLink = linkedMeeting.getMeetUrl();
            }

            if (classStartTime != null) {
                java.time.format.DateTimeFormatter timeFmt = java.time.format.DateTimeFormatter.ofPattern("hh:mm a");
                String startStr = classStartTime.format(timeFmt);
                String endStr = classEndTime != null ? classEndTime.format(timeFmt) : classStartTime.plusHours(1).format(timeFmt);
                timing = startStr + " - " + endStr;
            }

            result.add(new TodayClassResponse(
                    cls.getId(),
                    cls.getBatch() != null ? cls.getBatch().getId() : null,
                    cls.getBatch() != null ? cls.getBatch().getName() : "All Batches",
                    classStartTime,
                    classEndTime,
                    cls.getTitle(),
                    cls.getStatus(),
                    present, absent, totalStudents,
                    meetLink,
                    cls.getRecordingUrl(),
                    trainerName,
                    courseTitle,
                    mode,
                    timing));
        }

        // Include any scheduled MeetingLinks that don't have a DailyClass already rendered
        for (MeetingLink m : allMeetings) {
            DailyClass dc = m.getDailyClass();
            if (dc == null && m.getBatch() != null) {
                try {
                    dc = new DailyClass();
                    dc.setBatch(m.getBatch());
                    dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
                    dc.setTitle(m.getTitle() != null && !m.getTitle().isBlank() ? m.getTitle() : "Scheduled Class");
                    dc.setMeetLink(m.getMeetUrl());
                    dc.setStatus(ClassStatus.SCHEDULED);
                    dc = dailyClassRepository.save(dc);
                    m.setDailyClass(dc);
                    meetingLinkRepository.save(m);
                } catch (Exception e) {
                    log.warn("Failed to auto-create daily class for meetingLinkId {}: {}", m.getId(), e.getMessage(), e);
                }
            }

            if (dc != null && renderedDailyClassIds.contains(dc.getId())) {
                continue;
            }
            String key = (m.getBatch() != null ? m.getBatch().getId() : "null")
                    + "|" + (m.getTitle() != null ? m.getTitle().trim().toLowerCase() : "")
                    + "|" + (m.getScheduledStart() != null ? m.getScheduledStart().toLocalDate() + "T" + m.getScheduledStart().getHour() + ":" + m.getScheduledStart().getMinute() : "");
            if (seenKeys.add(key)) {
                int totalStudents = m.getBatch() != null ? studentCountByBatchId.getOrDefault(m.getBatch().getId(), 0) : 0;
                String trainerName = null;
                String courseTitle = null;
                String mode = "ONLINE";
                String timing = null;

                if (m.getBatch() != null) {
                    if (m.getBatch().getTrainerId() != null) {
                        trainerName = trainerNameById.get(m.getBatch().getTrainerId());
                    }
                    if (m.getBatch().getCourse() != null) {
                        courseTitle = m.getBatch().getCourse().getTitle();
                    }
                    if (m.getBatch().getMode() != null) {
                        mode = m.getBatch().getMode().name();
                    }
                    timing = m.getBatch().getTiming();
                }

                if (m.getHostName() != null && !m.getHostName().isBlank()) {
                    trainerName = m.getHostName();
                }

                if (courseTitle == null && m.getCourse() != null) {
                    courseTitle = m.getCourse().getTitle();
                }

                LocalDateTime classStartTime = m.getScheduledStart();
                LocalDateTime classEndTime = m.getScheduledEnd();
                if (classStartTime != null) {
                    java.time.format.DateTimeFormatter timeFmt = java.time.format.DateTimeFormatter.ofPattern("hh:mm a");
                    String startStr = classStartTime.format(timeFmt);
                    String endStr = classEndTime != null ? classEndTime.format(timeFmt) : classStartTime.plusHours(1).format(timeFmt);
                    timing = startStr + " - " + endStr;
                }

                result.add(new TodayClassResponse(
                        dc != null ? dc.getId() : (m.getDailyClass() != null ? m.getDailyClass().getId() : null),
                        m.getBatch() != null ? m.getBatch().getId() : null,
                        m.getBatch() != null ? m.getBatch().getName() : (courseTitle != null ? courseTitle : "All Batches"),
                        classStartTime,
                        classEndTime,
                        m.getTitle(),
                        ClassStatus.SCHEDULED,
                        0, 0, totalStudents,
                        m.getMeetUrl(),
                        null,
                        trainerName,
                        courseTitle,
                        mode,
                        timing));
            }
        }

        return result;
    }
}
