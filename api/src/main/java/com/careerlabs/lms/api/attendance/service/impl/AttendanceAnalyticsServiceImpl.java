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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceAnalyticsServiceImpl implements AttendanceAnalyticsService {

    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final DailyClassRepository dailyClassRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendancePolicyService attendancePolicyService;
    private final AttendanceRiskService attendanceRiskService;
    private final MeetingLinkRepository meetingLinkRepository;

    public AttendanceAnalyticsServiceImpl(
            BatchRepository batchRepository,
            StudentRepository studentRepository,
            DailyClassRepository dailyClassRepository,
            AttendanceRepository attendanceRepository,
            AttendancePolicyService attendancePolicyService,
            AttendanceRiskService attendanceRiskService,
            MeetingLinkRepository meetingLinkRepository) {
        this.batchRepository = batchRepository;
        this.studentRepository = studentRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendancePolicyService = attendancePolicyService;
        this.attendanceRiskService = attendanceRiskService;
        this.meetingLinkRepository = meetingLinkRepository;
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
            List<Student> students = studentRepository.findByBatchId(batch.getId());
            if (students.isEmpty()) continue;

            totalBatchStudents += students.size();
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

        // Use the same count as the dashboard so both views show the same number
        int totalStudents = (int) studentRepository.count();

        // Average = sum of each student's pct / active-batch students (includes 0% for unmarked)
        int averageAttendance = totalBatchStudents > 0
                ? (int) Math.round(totalStudentPctSum / totalBatchStudents)
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
            List<Student> students = studentRepository.findByBatchId(batch.getId());
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
    @Transactional(readOnly = true)
    public List<TodayClassResponse> getTodayClasses(LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<DailyClass> classes = dailyClassRepository.findByDateBetweenOrderByDateAsc(startOfDay, endOfDay);
        List<MeetingLink> scheduledMeetings = meetingLinkRepository.findByScheduledStartBetweenOrderByScheduledStartAsc(startOfDay, endOfDay);

        List<Long> classIds = classes.stream().map(DailyClass::getId).toList();
        Map<Long, List<Attendance>> attendanceByClassId = classIds.isEmpty() ? Map.of() : attendanceRepository
                .findByDailyClassIdIn(classIds).stream()
                .collect(Collectors.groupingBy(a -> a.getDailyClass().getId()));

        List<Long> batchIds = classes.stream()
                .filter(cls -> cls.getBatch() != null)
                .map(cls -> cls.getBatch().getId())
                .distinct().toList();
        Map<Long, Integer> studentCountByBatchId = batchIds.isEmpty() ? Map.of() : studentRepository
                .findByBatchIdIn(batchIds).stream()
                .collect(Collectors.groupingBy(s -> s.getBatch().getId(), Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

        Set<String> seenKeys = new HashSet<>();
        List<TodayClassResponse> result = new ArrayList<>();

        for (DailyClass cls : classes) {
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

            result.add(new TodayClassResponse(
                    cls.getId(),
                    cls.getBatch() != null ? cls.getBatch().getId() : null,
                    cls.getBatch() != null ? cls.getBatch().getName() : "All Batches",
                    cls.getDate(),
                    cls.getTitle(),
                    cls.getStatus(),
                    present, absent, totalStudents,
                    cls.getMeetLink(),
                    cls.getRecordingUrl()));
        }

        // Include any scheduled MeetingLinks that don't have a DailyClass linked or matched
        for (MeetingLink m : scheduledMeetings) {
            String key = (m.getBatch() != null ? m.getBatch().getId() : "null")
                    + "|" + (m.getTitle() != null ? m.getTitle().trim().toLowerCase() : "")
                    + "|" + (m.getScheduledStart() != null ? m.getScheduledStart().toLocalDate() + "T" + m.getScheduledStart().getHour() + ":" + m.getScheduledStart().getMinute() : "");
            if (m.getDailyClass() == null && seenKeys.add(key)) {
                int totalStudents = m.getBatch() != null ? studentCountByBatchId.getOrDefault(m.getBatch().getId(), 0) : 0;
                result.add(new TodayClassResponse(
                        null,
                        m.getBatch() != null ? m.getBatch().getId() : null,
                        m.getBatch() != null ? m.getBatch().getName() : (m.getCourse() != null ? m.getCourse().getTitle() : "All Batches"),
                        m.getScheduledStart(),
                        m.getTitle(),
                        ClassStatus.SCHEDULED,
                        0, 0, totalStudents,
                        m.getMeetUrl(),
                        null));
            }
        }

        return result;
    }
}
