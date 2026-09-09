package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.request.AttendanceCorrectionRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCorrectionResponse;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.AttendanceAuditLog;
import com.careerlabs.lms.api.attendance.repository.AttendanceAuditLogRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceCorrectionService;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
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
    private final DailyClassRepository dailyClassRepository;
    private final MeetingLinkRepository meetingLinkRepository;
    private final StudentRepository studentRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final AttendanceAuditLogRepository attendanceAuditLogRepository;

    public AttendanceCorrectionServiceImpl(
            AttendanceCorrectionRepository attendanceCorrectionRepository,
            AttendanceRepository attendanceRepository,
            DailyClassRepository dailyClassRepository,
            MeetingLinkRepository meetingLinkRepository,
            StudentRepository studentRepository,
            NotificationService notificationService,
            UserRepository userRepository,
            AttendanceAuditLogRepository attendanceAuditLogRepository) {
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.attendanceRepository = attendanceRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.meetingLinkRepository = meetingLinkRepository;
        this.studentRepository = studentRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.attendanceAuditLogRepository = attendanceAuditLogRepository;
    }

    @Override
    @Transactional
    public AttendanceCorrectionResponse create(Long userId, AttendanceCorrectionRequest request) {
        Student student = resolveStudent(userId);

        Attendance attendance;
        if (request.getAttendanceId() != null) {
            attendance = attendanceRepository.findById(request.getAttendanceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + request.getAttendanceId()));

            if (!attendance.getStudent().getId().equals(student.getId())) {
                throw new ForbiddenException("This attendance record does not belong to you");
            }
        } else if (request.getDailyClassId() != null) {
            DailyClass dailyClass = dailyClassRepository.findById(request.getDailyClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class not found with id: " + request.getDailyClassId()));

            if (student.getBatch() == null || !student.getBatch().getId().equals(dailyClass.getBatch().getId())) {
                throw new ForbiddenException("This class does not belong to your batch");
            }
            attendance = resolveOrCreateAttendance(student, dailyClass);
        } else if (request.getMeetingLinkId() != null) {
            DailyClass dailyClass = resolveOrCreateDailyClassForMeeting(student, request.getMeetingLinkId());
            attendance = resolveOrCreateAttendance(student, dailyClass);
        } else {
            throw new BadRequestException("One of attendanceId, dailyClassId or meetingLinkId is required");
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

    /**
     * A student is disputing a class that was never marked for them at all — there's no
     * Attendance row to reference yet. Reuse one if it already exists (e.g. a second
     * request after a rejected one), otherwise create it defaulting to ABSENT, which is
     * exactly what "never marked" already means everywhere else in this module. Approving
     * the resulting correction then works through the existing review() flow unchanged.
     */
    private Attendance resolveOrCreateAttendance(Student student, DailyClass dailyClass) {
        return attendanceRepository.findByStudentIdAndDailyClassId(student.getId(), dailyClass.getId())
                .orElseGet(() -> {
                    Attendance attendance = new Attendance();
                    attendance.setStudent(student);
                    attendance.setDailyClass(dailyClass);
                    attendance.setStatus(AttendStatus.ABSENT);
                    return attendanceRepository.save(attendance);
                });
    }

    /**
     * A Scheduled Class (Zoom) session that attendance never knew about — no DailyClass
     * exists for it yet. Create one, on the student's own batch (Scheduled Classes can be
     * batch-less/course-wide/global, but attendance is always tracked per-batch), and link
     * it back to the MeetingLink so this only ever happens once per session — after which
     * {@link com.careerlabs.lms.api.attendance.service.AttendanceVerificationService} will
     * naturally find this exact meeting when an admin verifies the resulting request.
     */
    private DailyClass resolveOrCreateDailyClassForMeeting(Student student, Long meetingLinkId) {
        MeetingLink meeting = meetingLinkRepository.findById(meetingLinkId)
                .orElseThrow(() -> new ResourceNotFoundException("Scheduled class not found with id: " + meetingLinkId));

        if (meeting.getDailyClass() != null) {
            return meeting.getDailyClass();
        }

        Long studentBatchId = student.getBatch() != null ? student.getBatch().getId() : null;
        Long studentCourseId = student.getCourse() != null ? student.getCourse().getId() : null;
        Long meetingBatchId = meeting.getBatch() != null ? meeting.getBatch().getId() : null;
        Long meetingCourseId = meeting.getCourse() != null ? meeting.getCourse().getId() : null;
        boolean visible = (meetingBatchId != null && meetingBatchId.equals(studentBatchId))
                || (meetingBatchId == null && meetingCourseId != null && meetingCourseId.equals(studentCourseId))
                || (meetingBatchId == null && meetingCourseId == null);
        if (!visible) {
            throw new ForbiddenException("This scheduled class does not apply to you");
        }

        Batch batch = meeting.getBatch() != null ? meeting.getBatch() : student.getBatch();
        if (batch == null) {
            throw new BadRequestException(
                    "This scheduled class isn't tied to a specific batch, and you're not assigned to one either — "
                            + "ask an admin to either assign you to a batch, or edit the scheduled class to target a specific batch.");
        }

        DailyClass dailyClass = new DailyClass();
        dailyClass.setBatch(batch);
        dailyClass.setDate(meeting.getScheduledStart());
        dailyClass.setTitle(meeting.getTitle());
        dailyClass.setMeetLink(meeting.getMeetUrl());
        dailyClass.setStatus(ClassStatus.COMPLETED);
        dailyClass = dailyClassRepository.save(dailyClass);

        meeting.setDailyClass(dailyClass);
        meetingLinkRepository.save(meeting);

        return dailyClass;
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
            AttendStatus previousStatus = attendance.getStatus();
            attendance.setStatus(correction.getRequestedStatus());
            attendance.setMarkedBy(reviewerUserId);
            attendance.setMarkedAt(Instant.now());
            Attendance saved = attendanceRepository.save(attendance);

            try {
                AttendanceAuditLog auditLog = new AttendanceAuditLog();
                auditLog.setDailyClass(attendance.getDailyClass());
                auditLog.setStudent(attendance.getStudent());
                auditLog.setAttendanceId(saved.getId());
                auditLog.setPreviousStatus(previousStatus);
                auditLog.setNewStatus(correction.getRequestedStatus());
                auditLog.setChangedBy(reviewerUserId);
                auditLog.setActionType("CORRECTION_APPROVED");
                auditLog.setRemarks("Correction approved: " + (comment != null ? comment : correction.getReason()));
                if (reviewerUserId != null) {
                    userRepository.findById(reviewerUserId).ifPresent(u -> {
                        auditLog.setChangedByName(u.getName());
                        if (u.getRole() != null) auditLog.setChangedByRole(u.getRole().name());
                    });
                }
                attendanceAuditLogRepository.save(auditLog);
            } catch (Exception ignored) {}

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
