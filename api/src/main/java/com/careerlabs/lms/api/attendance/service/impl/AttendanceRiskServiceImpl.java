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

        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());
        int currentPercentage = percentageOf(attendances);

        List<Attendance> priorToRecent = attendances.size() > TREND_WINDOW
                ? attendances.subList(TREND_WINDOW, attendances.size())
                : List.of();
        int previousPercentage = priorToRecent.isEmpty() ? currentPercentage : percentageOf(priorToRecent);

        Long batchId = student.getBatch() != null ? student.getBatch().getId() : null;
        AttendancePolicy policy = attendancePolicyService.getEffectivePolicy(batchId);
        RiskLevel riskLevel = classify(currentPercentage, policy);

        return new AttendanceHealthResponse(currentPercentage, previousPercentage, currentPercentage - previousPercentage, riskLevel);
    }

    private int percentageOf(List<Attendance> attendances) {
        if (attendances.isEmpty()) {
            return 0;
        }
        long present = attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
        return (int) Math.round((present * 100.0) / attendances.size());
    }
}
