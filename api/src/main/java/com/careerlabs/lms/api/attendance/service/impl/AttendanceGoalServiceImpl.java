package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceGoalResponse;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.AttendanceGoal;
import com.careerlabs.lms.api.attendance.repository.AttendanceGoalRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceGoalService;
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
public class AttendanceGoalServiceImpl implements AttendanceGoalService {

    private final AttendanceGoalRepository attendanceGoalRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public AttendanceGoalServiceImpl(
            AttendanceGoalRepository attendanceGoalRepository,
            AttendanceRepository attendanceRepository,
            StudentRepository studentRepository,
            UserRepository userRepository) {
        this.attendanceGoalRepository = attendanceGoalRepository;
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceGoalResponse getGoal(Long userId) {
        Student student = resolveStudent(userId);
        Integer target = attendanceGoalRepository.findByStudentId(student.getId())
                .map(AttendanceGoal::getTargetPercentage)
                .orElse(null);
        return buildResponse(student, target);
    }

    @Override
    @Transactional
    public AttendanceGoalResponse setGoal(Long userId, int targetPercentage) {
        Student student = resolveStudent(userId);
        AttendanceGoal goal = attendanceGoalRepository.findByStudentId(student.getId())
                .orElseGet(() -> {
                    AttendanceGoal g = new AttendanceGoal();
                    g.setStudentId(student.getId());
                    return g;
                });
        goal.setTargetPercentage(targetPercentage);
        attendanceGoalRepository.save(goal);
        return buildResponse(student, targetPercentage);
    }

    private Student resolveStudent(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + userId));
                    Student s = new Student();
                    s.setUser(user);
                    s.setEnrollmentNo("STU-" + String.format("%05d", user.getId()));
                    return studentRepository.save(s);
                });
    }

    private AttendanceGoalResponse buildResponse(Student student, Integer target) {
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

        int present = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.LATE).count();
        int total = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.ABSENT || a.getStatus() == AttendStatus.LATE).count();
        int currentPercentage = total > 0 ? (int) Math.round((present * 100.0) / total) : 0;

        if (target == null) {
            return new AttendanceGoalResponse(null, currentPercentage, 0, false);
        }

        boolean achieved = total > 0 && currentPercentage >= target;
        int classesNeeded = achieved ? 0 : classesNeededFor(present, total, target);
        return new AttendanceGoalResponse(target, currentPercentage, classesNeeded, achieved);
    }

    private int classesNeededFor(int present, int total, int targetPercentage) {
        double f = targetPercentage / 100.0;
        if (f >= 1.0) {
            return Integer.MAX_VALUE;
        }
        double raw = (f * total - present) / (1 - f);
        return Math.max(0, (int) Math.ceil(raw));
    }
}
