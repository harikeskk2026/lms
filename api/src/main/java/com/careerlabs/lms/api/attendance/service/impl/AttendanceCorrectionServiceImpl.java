package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.request.AttendanceCorrectionRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCorrectionResponse;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceCorrectionService;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class AttendanceCorrectionServiceImpl implements AttendanceCorrectionService {

    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public AttendanceCorrectionServiceImpl(
            AttendanceCorrectionRepository attendanceCorrectionRepository,
            AttendanceRepository attendanceRepository,
            StudentRepository studentRepository,
            NotificationService notificationService,
            UserRepository userRepository) {
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public AttendanceCorrectionResponse create(Long userId, AttendanceCorrectionRequest request) {
        Student student = resolveStudent(userId);

        Attendance attendance = attendanceRepository.findById(request.getAttendanceId())
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + request.getAttendanceId()));

        if (!attendance.getStudent().getId().equals(student.getId())) {
            throw new ForbiddenException("This attendance record does not belong to you");
        }

        attendanceCorrectionRepository.findFirstByAttendanceIdAndStatus(attendance.getId(), CorrectionStatus.PENDING)
                .ifPresent(existing -> {
                    throw new ConflictException("A correction request for this class is already pending");
                });

        AttendanceCorrection correction = new AttendanceCorrection();
        correction.setAttendance(attendance);
        correction.setStudent(student);
        correction.setRequestedStatus(request.getRequestedStatus());
        correction.setReason(request.getReason());
        correction.setComment(request.getComment());
        correction.setDocumentUrl(request.getDocumentUrl());

        AttendanceCorrection saved = attendanceCorrectionRepository.save(correction);
        return AttendanceCorrectionResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> listForStudent(Long userId) {
        Student student = resolveStudent(userId);

        return attendanceCorrectionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId()).stream()
                .map(AttendanceCorrectionResponse::from)
                .toList();
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

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> listForAdmin(CorrectionStatus status) {
        List<AttendanceCorrection> corrections = status != null
                ? attendanceCorrectionRepository.findByStatusOrderByCreatedAtDesc(status)
                : attendanceCorrectionRepository.findAllByOrderByCreatedAtDesc();

        return corrections.stream().map(AttendanceCorrectionResponse::from).toList();
    }

    @Override
    @Transactional
    public AttendanceCorrectionResponse review(Long correctionId, Long reviewerUserId, CorrectionStatus decision, String comment) {
        if (decision != CorrectionStatus.APPROVED && decision != CorrectionStatus.REJECTED) {
            throw new BadRequestException("Decision must be APPROVED or REJECTED");
        }

        AttendanceCorrection correction = attendanceCorrectionRepository.findById(correctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Correction request not found with id: " + correctionId));

        if (correction.getStatus() != CorrectionStatus.PENDING) {
            throw new BadRequestException("This correction request has already been reviewed");
        }

        correction.setStatus(decision);
        correction.setReviewedBy(reviewerUserId);
        correction.setReviewedAt(Instant.now());
        attendanceCorrectionRepository.save(correction);

        Long studentUserId = correction.getStudent().getUser().getId();
        String className = correction.getAttendance().getDailyClass().getTitle();

        if (decision == CorrectionStatus.APPROVED) {
            Attendance attendance = correction.getAttendance();
            attendance.setStatus(correction.getRequestedStatus());
            attendance.setMarkedBy(reviewerUserId);
            attendance.setMarkedAt(Instant.now());
            attendanceRepository.save(attendance);

            notificationService.notifyUser(studentUserId, "Correction Approved",
                    "Your attendance correction request for \"" + className + "\" was approved.",
                    NotificationType.SUCCESS, "/student/attendance/corrections");
        } else {
            notificationService.notifyUser(studentUserId, "Correction Rejected",
                    "Your attendance correction request for \"" + className + "\" was rejected."
                            + (comment != null && !comment.isBlank() ? " Reason: " + comment : ""),
                    NotificationType.WARNING, "/student/attendance/corrections");
        }

        return AttendanceCorrectionResponse.from(correction);
    }
}
