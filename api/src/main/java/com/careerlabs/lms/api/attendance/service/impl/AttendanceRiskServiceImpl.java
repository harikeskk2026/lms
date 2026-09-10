package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceHealthResponse;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;
import com.careerlabs.lms.api.attendance.entity.RiskLevel;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.service.AttendancePolicyService;
import com.careerlabs.lms.api.attendance.service.AttendanceRiskService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class AttendanceRiskServiceImpl implements AttendanceRiskService {

    private static final int TREND_WINDOW = 5;

    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final AttendancePolicyService attendancePolicyService;
    private final UserRepository userRepository;

    public AttendanceRiskServiceImpl(
            AttendanceRepository attendanceRepository,
            StudentRepository studentRepository,
            AttendancePolicyService attendancePolicyService,
            UserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.attendancePolicyService = attendancePolicyService;
        this.userRepository = userRepository;
    }

    @Override
    public RiskLevel classify(int percentage, AttendancePolicy policy) {
        if (percentage >= policy.getHealthyThreshold()) {
            return RiskLevel.HEALTHY;
        }
        if (percentage >= policy.getAtRiskThreshold()) {
            return RiskLevel.AT_RISK;
        }
        return RiskLevel.CRITICAL;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceHealthResponse getHealth(Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + userId));
                    Student s = new Student();
                    s.setUser(user);
                    s.setEnrollmentNo("STU-" + String.format("%05d", user.getId()));
                    return studentRepository.save(s);
                });

        List<Attendance> allAtt = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());
        LocalDate earliestAttendance = allAtt.stream()
                .filter(a -> a.getDailyClass() != null && a.getDailyClass().getDate() != null)
                .map(a -> a.getDailyClass().getDate().toLocalDate())
                .min(java.util.Comparator.naturalOrder())
                .orElse(null);

        LocalDate joiningDate = student.getJoiningDate();
        if (joiningDate == null) {
            if (student.getBatch() != null && student.getBatch().getStartDate() != null) {
                joiningDate = student.getBatch().getStartDate();
            } else if (earliestAttendance != null) {
                joiningDate = earliestAttendance;
            } else if (student.getCreatedAt() != null) {
                joiningDate = student.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
            } else {
                joiningDate = LocalDate.now();
            }
        }
        if (earliestAttendance != null && earliestAttendance.isBefore(joiningDate)) {
            joiningDate = earliestAttendance;
        }
        if (student.getJoiningDate() == null || !joiningDate.equals(student.getJoiningDate())) {
            student.setJoiningDate(joiningDate);
            studentRepository.save(student);
        }

        List<Attendance> attendances = allAtt.stream()
                .filter(a -> a.getDailyClass() != null)
                .toList();
        int overallPercentage = percentageOf(attendances);

        List<Attendance> recent = attendances.size() > TREND_WINDOW
                ? attendances.subList(0, TREND_WINDOW)
                : attendances;
        int currentPercentage = percentageOf(recent);

        List<Attendance> priorToRecent = attendances.size() > TREND_WINDOW
                ? attendances.subList(TREND_WINDOW, Math.min(TREND_WINDOW * 2, attendances.size()))
                : List.of();
        int previousPercentage = priorToRecent.isEmpty() ? currentPercentage : percentageOf(priorToRecent);

        Long batchId = student.getBatch() != null ? student.getBatch().getId() : null;
        AttendancePolicy policy = attendancePolicyService.getEffectivePolicy(batchId);
        RiskLevel riskLevel = attendances.isEmpty() ? RiskLevel.HEALTHY : classify(overallPercentage, policy);

        return new AttendanceHealthResponse(overallPercentage, currentPercentage, previousPercentage, currentPercentage - previousPercentage, riskLevel);
    }

    private int percentageOf(List<Attendance> attendances) {
        long present = attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.LATE).count();
        long countable = attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.ABSENT || a.getStatus() == AttendStatus.LATE).count();
        if (countable == 0) {
            return 0;
        }
        return (int) Math.round((present * 100.0) / countable);
    }
}
