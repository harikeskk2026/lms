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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AttendanceAnalyticsServiceImpl implements AttendanceAnalyticsService {

    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final DailyClassRepository dailyClassRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendancePolicyService attendancePolicyService;
    private final AttendanceRiskService attendanceRiskService;

    public AttendanceAnalyticsServiceImpl(
            BatchRepository batchRepository,
            StudentRepository studentRepository,
            DailyClassRepository dailyClassRepository,
            AttendanceRepository attendanceRepository,
            AttendancePolicyService attendancePolicyService,
            AttendanceRiskService attendanceRiskService) {
        this.batchRepository = batchRepository;
        this.studentRepository = studentRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendancePolicyService = attendancePolicyService;
        this.attendanceRiskService = attendanceRiskService;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceCommandCenterResponse getCommandCenter() {
        List<Batch> activeBatches = batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(Batch::isActive)
                .toList();

        int totalStudents = 0;
        int below75Count = 0;
        int criticalCount = 0;
        int totalPctSum = 0;
        int batchesWithStudents = 0;

        for (Batch batch : activeBatches) {
            List<Student> students = studentRepository.findByBatchId(batch.getId());
            if (students.isEmpty()) continue;

            List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batch.getId());
            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));
            AttendancePolicy policy = attendancePolicyService.getEffectivePolicy(batch.getId());

            int batchPctSum = 0;
            for (Student student : students) {
                totalStudents++;
                List<Attendance> studentAttendance = byStudent.getOrDefault(student.getId(), List.of());
                int total = studentAttendance.size();
                if (total == 0) continue;

                int present = (int) studentAttendance.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                int pct = (int) Math.round((present * 100.0) / total);
                batchPctSum += pct;

                if (pct < policy.getHealthyThreshold()) {
                    below75Count++;
                }
                if (attendanceRiskService.classify(pct, policy) == RiskLevel.CRITICAL) {
                    criticalCount++;
                }
            }
            totalPctSum += students.isEmpty() ? 0 : batchPctSum / students.size();
            batchesWithStudents++;
        }

        int averageAttendance = batchesWithStudents > 0 ? totalPctSum / batchesWithStudents : 0;

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);
        int todaysClasses = dailyClassRepository.findByDateBetweenOrderByDateAsc(startOfDay, endOfDay).size();
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
        int totalPctSum = 0;
        int batchesWithStudents = 0;

        for (Batch batch : activeBatches) {
            List<Student> students = studentRepository.findByBatchId(batch.getId());
            if (students.isEmpty()) continue;

            List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batch.getId());
            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));
            AttendancePolicy policy = attendancePolicyService.getEffectivePolicy(batch.getId());

            int batchPctSum = 0;
            for (Student student : students) {
                totalStudents++;
                List<Attendance> studentAttendance = byStudent.getOrDefault(student.getId(), List.of());
                int total = studentAttendance.size();
                if (total == 0) continue;

                int present = (int) studentAttendance.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                int pct = (int) Math.round((present * 100.0) / total);
                batchPctSum += pct;

                if (pct < policy.getHealthyThreshold()) {
                    below75Count++;
                }
                if (attendanceRiskService.classify(pct, policy) == RiskLevel.CRITICAL) {
                    criticalCount++;
                }
            }
            totalPctSum += students.isEmpty() ? 0 : batchPctSum / students.size();
            batchesWithStudents++;
        }

        int averageAttendance = batchesWithStudents > 0 ? totalPctSum / batchesWithStudents : 0;

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);
        List<DailyClass> todayClasses = dailyClassRepository.findByDateBetweenOrderByDateAsc(startOfDay, endOfDay).stream()
                .filter(c -> c.getBatch() != null && batchIds.contains(c.getBatch().getId()))
                .toList();
        int todaysClasses = todayClasses.size();
        int unmarkedClasses = (int) todayClasses.stream()
                .filter(c -> c.getStatus() == ClassStatus.SCHEDULED && !c.getDate().isAfter(LocalDateTime.now()))
                .count();

        return new AttendanceCommandCenterResponse(totalStudents, todaysClasses, averageAttendance, below75Count, criticalCount, unmarkedClasses);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TodayClassResponse> getTodayClasses() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);
        List<DailyClass> classes = dailyClassRepository.findByDateBetweenOrderByDateAsc(startOfDay, endOfDay);

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

        List<TodayClassResponse> result = new ArrayList<>();
        for (DailyClass cls : classes) {
            List<Attendance> attendances = attendanceByClassId.getOrDefault(cls.getId(), List.of());
            int present = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
            int absent = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
            int totalStudents = cls.getBatch() != null ? studentCountByBatchId.getOrDefault(cls.getBatch().getId(), 0) : 0;

            result.add(new TodayClassResponse(
                    cls.getId(),
                    cls.getBatch().getId(),
                    cls.getBatch().getName(),
                    cls.getDate(),
                    cls.getTitle(),
                    cls.getStatus(),
                    present, absent, totalStudents,
                    cls.getMeetLink(),
                    cls.getRecordingUrl()));
        }
        return result;
    }
}
