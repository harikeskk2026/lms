package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.AttendanceAlertResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceAnalyticsResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceHistoryResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceOverviewItemResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceRecordRequest;
import com.careerlabs.lms.api.attendance.dto.AttendanceSheetItemResponse;
import com.careerlabs.lms.api.attendance.dto.BatchAttendanceMatrixResponse;
import com.careerlabs.lms.api.attendance.dto.DailyClassRequest;
import com.careerlabs.lms.api.attendance.dto.DailyClassResponse;
import com.careerlabs.lms.api.attendance.dto.LowAttendanceStudentResponse;
import com.careerlabs.lms.api.attendance.dto.StudentAttendanceSummaryResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCalendarDayResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceHistoryPageResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceHistoryRowResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceRecordResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendanceAlert;
import com.careerlabs.lms.api.attendance.entity.AttendanceAuditLog;
import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.entity.RiskLevel;
import com.careerlabs.lms.api.attendance.repository.AttendanceAlertRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceAuditLogRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceService;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchAuthorizationGuard;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.notification.entity.Notification;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class AttendanceServiceImpl implements AttendanceService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AttendanceServiceImpl.class);

    private final DailyClassRepository dailyClassRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceAlertRepository attendanceAlertRepository;
    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final MeetingLinkRepository meetingLinkRepository;
    private final MeetingAttendeeRepository meetingAttendeeRepository;
    private final AttendanceAuditLogRepository attendanceAuditLogRepository;
    private final BatchAuthorizationGuard batchAuthGuard;

    public AttendanceServiceImpl(
            DailyClassRepository dailyClassRepository,
            AttendanceRepository attendanceRepository,
            AttendanceAlertRepository attendanceAlertRepository,
            AttendanceCorrectionRepository attendanceCorrectionRepository,
            BatchRepository batchRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            MeetingLinkRepository meetingLinkRepository,
            MeetingAttendeeRepository meetingAttendeeRepository,
            AttendanceAuditLogRepository attendanceAuditLogRepository,
            BatchAuthorizationGuard batchAuthGuard) {
        this.dailyClassRepository = dailyClassRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendanceAlertRepository = attendanceAlertRepository;
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.batchRepository = batchRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.meetingLinkRepository = meetingLinkRepository;
        this.meetingAttendeeRepository = meetingAttendeeRepository;
        this.attendanceAuditLogRepository = attendanceAuditLogRepository;
        this.batchAuthGuard = batchAuthGuard;
    }

    private void recordAuditLog(DailyClass dailyClass, Student student, Long attendanceId,
                                AttendStatus previousStatus, AttendStatus newStatus,
                                Long markerUserId, String remarks, String actionType) {
        try {
            AttendanceAuditLog log = new AttendanceAuditLog();
            log.setDailyClass(dailyClass);
            log.setStudent(student);
            log.setAttendanceId(attendanceId);
            log.setPreviousStatus(previousStatus);
            log.setNewStatus(newStatus);
            log.setChangedBy(markerUserId);
            log.setRemarks(remarks);
            log.setActionType(actionType);

            if (markerUserId != null) {
                userRepository.findById(markerUserId).ifPresent(u -> {
                    log.setChangedByName(u.getName());
                    if (u.getRole() != null) {
                        log.setChangedByRole(u.getRole().name());
                    }
                });
            }
            attendanceAuditLogRepository.save(log);
        } catch (Exception e) {
            LOGGER.warn("Failed to record attendance audit log for classId={}, studentId={}, attendanceId={}: {}",
                    dailyClass != null ? dailyClass.getId() : null,
                    student != null ? student.getId() : null,
                    attendanceId,
                    e.getMessage(), e);
        }
    }

    private void syncMissingDailyClasses(Long batchId) {
        try {
            List<MeetingLink> meetings;
            if (batchId != null) {
                Batch targetBatch = batchRepository.findById(batchId).orElse(null);
                if (targetBatch != null) {
                    List<MeetingLink> batchMeetings = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(batchId);
                    List<MeetingLink> courseMeetings = targetBatch.getCourse() != null
                            ? meetingLinkRepository.findByCourseIdOrderByScheduledStartDesc(targetBatch.getCourse().getId())
                            : List.of();
                    meetings = new ArrayList<>(batchMeetings);
                    for (MeetingLink cm : courseMeetings) {
                        if (!meetings.contains(cm)) {
                            meetings.add(cm);
                        }
                    }
                } else {
                    meetings = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(batchId);
                }
            } else {
                meetings = meetingLinkRepository.findAll();
            }

            for (MeetingLink m : meetings) {
                if (m.getBatch() != null) {
                    if (m.getDailyClass() == null) {
                        DailyClass dc = new DailyClass();
                        dc.setBatch(m.getBatch());
                        dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
                        dc.setTitle(m.getTitle() != null && !m.getTitle().isBlank() ? m.getTitle() : "Scheduled Class");
                        dc.setMeetLink(m.getMeetUrl());
                        dc.setStatus(ClassStatus.SCHEDULED);
                        dc = dailyClassRepository.save(dc);
                        m.setDailyClass(dc);
                        meetingLinkRepository.save(m);
                    }
                } else if (m.getCourse() != null && batchId != null) {
                    Batch b = batchRepository.findById(batchId).orElse(null);
                    if (b != null && b.getCourse() != null && b.getCourse().getId().equals(m.getCourse().getId())) {
                        LocalDateTime start = m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now();
                        List<DailyClass> existing = dailyClassRepository.findByBatchIdOrderByDateDesc(batchId);
                        boolean alreadyExists = existing.stream().anyMatch(dc ->
                                (dc.getTitle() != null && dc.getTitle().equalsIgnoreCase(m.getTitle())) &&
                                (dc.getDate() != null && dc.getDate().toLocalDate().equals(start.toLocalDate())));
                        if (!alreadyExists) {
                            DailyClass dc = new DailyClass();
                            dc.setBatch(b);
                            dc.setDate(start);
                            dc.setTitle(m.getTitle() != null && !m.getTitle().isBlank() ? m.getTitle() : "Scheduled Class");
                            dc.setMeetLink(m.getMeetUrl());
                            dc.setStatus(ClassStatus.SCHEDULED);
                            dailyClassRepository.save(dc);
                        }
                    }
                }
            }
        } catch (Exception e) {
            LOGGER.warn("Failed to sync missing daily classes for batchId={}: {}", batchId, e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public List<DailyClassResponse> getClasses(Long batchId, String date, ClassStatus status, JwtUserPrincipal principal) {
        syncMissingDailyClasses(batchId);

        if (batchAuthGuard.isTrainer(principal)) {
            if (batchId != null && !batchAuthGuard.isValidBatchFilter(principal, batchId)) {
                throw new ForbiddenException("You are not assigned to this batch");
            }
            List<Long> trainerBatchIds = batchRepository.findByTrainerId(principal.id()).stream()
                    .map(Batch::getId).toList();
            if (trainerBatchIds.isEmpty()) {
                return List.of();
            }
            if (batchId == null) {
                List<DailyClass> classes = dailyClassRepository.findByBatchIdInAndDateBetweenOrderByDateAsc(
                        trainerBatchIds, java.time.LocalDate.now().minusYears(1).atStartOfDay(),
                        java.time.LocalDate.now().plusYears(1).atTime(23, 59));
                return classes.stream().map(this::toDailyClassResponse).toList();
            }
        }

        List<DailyClass> classes;
        if (batchId != null) {
            if (status != null) {
                classes = dailyClassRepository.findByBatchIdAndStatusOrderByDateDesc(batchId, status);
            } else {
                classes = dailyClassRepository.findByBatchIdOrderByDateDesc(batchId);
            }
        } else {
            if (status != null) {
                classes = dailyClassRepository.findByStatusOrderByDateAsc(status);
            } else {
                classes = dailyClassRepository.findAll();
            }
        }

        return classes.stream().map(this::toDailyClassResponse).toList();
    }

    @Override
    @Transactional
    public DailyClassResponse createClass(DailyClassRequest request, JwtUserPrincipal principal) {
        Batch batch = batchAuthGuard.requireBatchOwnership(principal, request.batchId());

        if (!batch.isActive()) {
            throw new IllegalStateException("Cannot create a class for a completed or inactive batch: " + batch.getName());
        }

        DailyClass dailyClass = new DailyClass();
        dailyClass.setBatch(batch);
        dailyClass.setDate(request.date());
        dailyClass.setTitle(request.title());
        dailyClass.setNotes(request.notes());
        dailyClass.setRecordingUrl(request.recordingUrl());
        dailyClass.setMeetLink(request.meetLink());
        dailyClass.setStatus(request.status() != null ? request.status() : ClassStatus.SCHEDULED);

        DailyClass saved = dailyClassRepository.save(dailyClass);
        return toDailyClassResponse(saved);
    }

    @Override
    @Transactional
    public DailyClassResponse updateClass(Long classId, DailyClassRequest request, JwtUserPrincipal principal) {
        DailyClass dailyClass = dailyClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + classId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                dailyClass.getBatch() != null ? dailyClass.getBatch().getId() : null);

        if (request.title() != null) dailyClass.setTitle(request.title());
        if (request.date() != null) dailyClass.setDate(request.date());
        if (request.notes() != null) dailyClass.setNotes(request.notes());
        if (request.recordingUrl() != null) dailyClass.setRecordingUrl(request.recordingUrl());
        if (request.meetLink() != null) dailyClass.setMeetLink(request.meetLink());
        if (request.status() != null) dailyClass.setStatus(request.status());

        DailyClass updated = dailyClassRepository.save(dailyClass);
        return toDailyClassResponse(updated);
    }

    @Override
    @Transactional
    public void deleteClass(Long classId, JwtUserPrincipal principal) {
        DailyClass dailyClass = dailyClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + classId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                dailyClass.getBatch() != null ? dailyClass.getBatch().getId() : null);

        // 1. Delete associated MeetingLinks if any
        List<MeetingLink> meetings = meetingLinkRepository.findByDailyClassIn(List.of(dailyClass));
        for (MeetingLink m : meetings) {
            meetingAttendeeRepository.deleteByMeetingId(m.getId());
            meetingLinkRepository.delete(m);
        }

        // 2. Delete corrections, audit logs, and attendance records
        attendanceCorrectionRepository.deleteByDailyClassId(classId);
        attendanceAuditLogRepository.deleteByDailyClassId(classId);
        attendanceRepository.deleteByDailyClassId(classId);

        // 3. Delete the class
        dailyClassRepository.delete(dailyClass);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceSheetItemResponse> getAttendanceSheet(Long classId, JwtUserPrincipal principal) {
        DailyClass dailyClass = dailyClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + classId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                dailyClass.getBatch() != null ? dailyClass.getBatch().getId() : null);

        Long batchId = dailyClass.getBatch().getId();
        List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batchId);
        List<Attendance> attendances = attendanceRepository.findByDailyClassId(classId);

        Map<Long, Attendance> attendanceMap = attendances.stream()
                .collect(Collectors.toMap(a -> a.getStudent().getId(), a -> a, (existing, replacement) -> replacement));

        return students.stream().map(student -> {
            Attendance existing = attendanceMap.get(student.getId());
            return new AttendanceSheetItemResponse(
                    student.getId(),
                    student.getUser().getId(),
                    student.getUser().getName(),
                    student.getUser().getEmail(),
                    student.getEnrollmentNo(),
                    existing != null ? existing.getStatus() : AttendStatus.ABSENT,
                    existing != null ? existing.getRemarks() : null
            );
        }).toList();
    }

    @Override
    @Transactional
    public List<AttendanceSheetItemResponse> markAttendance(Long classId, List<AttendanceRecordRequest> records) {
        return markAttendance(classId, records, true, (JwtUserPrincipal) null);
    }

    @Override
    @Transactional
    public List<AttendanceSheetItemResponse> markAttendance(Long classId, List<AttendanceRecordRequest> records, boolean submit, JwtUserPrincipal principal) {
        DailyClass dailyClass = dailyClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + classId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                dailyClass.getBatch() != null ? dailyClass.getBatch().getId() : null);

        // Guard: do not allow marking attendance for future-dated classes
        if (dailyClass.getDate() != null && dailyClass.getDate().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Cannot mark attendance for a future-dated class: " + dailyClass.getTitle());
        }

        // Guard: do not allow marking attendance for classes belonging to inactive/completed batches
        Batch classBatch = dailyClass.getBatch();
        if (classBatch != null && !classBatch.isActive()) {
            throw new IllegalStateException(
                    "Cannot mark attendance for class '" + dailyClass.getTitle() +
                    "' because batch '" + classBatch.getName() + "' is no longer active.");
        }

        Long markerUserId = principal != null ? principal.id() : null;

        for (AttendanceRecordRequest rec : records) {
            Student student = studentRepository.findById(rec.studentId())
                    .orElseGet(() -> studentRepository.findByUserId(rec.studentId()).orElse(null));

            if (student == null) continue;

            Optional<Attendance> existing = attendanceRepository.findByStudentIdAndDailyClassId(student.getId(), classId);
            AttendStatus previousStatus = existing.map(Attendance::getStatus).orElse(null);
            boolean isNew = existing.isEmpty();

            attendanceRepository.upsertAttendance(
                    student.getId(),
                    classId,
                    rec.status().name(),
                    Instant.now(),
                    markerUserId,
                    rec.remarks()
            );

            Attendance saved = attendanceRepository.findByStudentIdAndDailyClassId(student.getId(), classId).orElse(null);
            if (saved != null) {
                String actionType = isNew ? "INITIAL_MARK" : (previousStatus != rec.status() ? "STATUS_CHANGE" : "MARK_UPDATE");
                recordAuditLog(dailyClass, student, saved.getId(), previousStatus, rec.status(), markerUserId, rec.remarks(), actionType);
            }
        }

        if (submit) {
            dailyClass.setStatus(ClassStatus.COMPLETED);
            dailyClassRepository.save(dailyClass);
        }

        return getAttendanceSheet(classId, principal);
    }

    @Override
    @Transactional
    public List<AttendanceSheetItemResponse> markAttendance(Long classId, List<AttendanceRecordRequest> records, boolean submit, Long markerUserId) {
        DailyClass dailyClass = dailyClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + classId));

        // Guard: do not allow marking attendance for future-dated classes
        if (dailyClass.getDate() != null && dailyClass.getDate().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Cannot mark attendance for a future-dated class: " + dailyClass.getTitle());
        }

        // Guard: do not allow marking attendance for classes belonging to inactive/completed batches
        Batch classBatch = dailyClass.getBatch();
        if (classBatch != null && !classBatch.isActive()) {
            throw new IllegalStateException(
                    "Cannot mark attendance for class '" + dailyClass.getTitle() +
                    "' because batch '" + classBatch.getName() + "' is no longer active.");
        }

        for (AttendanceRecordRequest rec : records) {
            Student student = studentRepository.findById(rec.studentId())
                    .orElseGet(() -> studentRepository.findByUserId(rec.studentId()).orElse(null));

            if (student == null) continue;

            Optional<Attendance> existing = attendanceRepository.findByStudentIdAndDailyClassId(student.getId(), classId);
            AttendStatus previousStatus = existing.map(Attendance::getStatus).orElse(null);
            boolean isNew = existing.isEmpty();

            attendanceRepository.upsertAttendance(
                    student.getId(),
                    classId,
                    rec.status().name(),
                    Instant.now(),
                    markerUserId,
                    rec.remarks()
            );

            Attendance saved = attendanceRepository.findByStudentIdAndDailyClassId(student.getId(), classId).orElse(null);
            if (saved != null) {
                String actionType = isNew ? "INITIAL_MARK" : (previousStatus != rec.status() ? "STATUS_CHANGE" : "MARK_UPDATE");
                recordAuditLog(dailyClass, student, saved.getId(), previousStatus, rec.status(), markerUserId, rec.remarks(), actionType);
            }
        }

        if (submit) {
            dailyClass.setStatus(ClassStatus.COMPLETED);
            dailyClassRepository.save(dailyClass);
        }

        return getAttendanceSheet(classId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceSheetItemResponse> getPreviousAttendanceSheet(Long classId, JwtUserPrincipal principal) {
        DailyClass currentClass = dailyClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + classId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                currentClass.getBatch() != null ? currentClass.getBatch().getId() : null);

        DailyClass previous = dailyClassRepository.findFirstByBatchIdAndStatusAndDateLessThanOrderByDateDesc(
                        currentClass.getBatch().getId(), ClassStatus.COMPLETED, currentClass.getDate())
                .orElseThrow(() -> new ResourceNotFoundException("No previous completed class found for this batch"));

        return getAttendanceSheet(previous.getId(), principal);
    }

    @Override
    @Transactional
    public AttendanceRecordResponse editAttendanceRecord(Long attendanceId, JwtUserPrincipal principal, AttendStatus status, String remarks) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + attendanceId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                attendance.getDailyClass() != null && attendance.getDailyClass().getBatch() != null
                        ? attendance.getDailyClass().getBatch().getId() : null);

        Long reviewerUserId = principal != null ? principal.id() : null;

        AttendStatus previousStatus = attendance.getStatus();
        attendance.setStatus(status);
        attendance.setRemarks(remarks);
        if (reviewerUserId != null) {
            attendance.setMarkedBy(reviewerUserId);
        }
        attendance.setMarkedAt(Instant.now());

        Attendance saved = attendanceRepository.save(attendance);

        recordAuditLog(saved.getDailyClass(), saved.getStudent(), saved.getId(), previousStatus, status, reviewerUserId, remarks, "ADMIN_EDIT");

        return AttendanceRecordResponse.from(saved);
    }

    @Override
    @Transactional
    public AttendanceRecordResponse editAttendanceRecord(Long attendanceId, Long reviewerUserId, AttendStatus status, String remarks) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + attendanceId));

        AttendStatus previousStatus = attendance.getStatus();
        attendance.setStatus(status);
        attendance.setRemarks(remarks);
        attendance.setMarkedBy(reviewerUserId);
        attendance.setMarkedAt(Instant.now());

        Attendance saved = attendanceRepository.save(attendance);

        recordAuditLog(saved.getDailyClass(), saved.getStudent(), saved.getId(), previousStatus, status, reviewerUserId, remarks, "ADMIN_EDIT");

        return AttendanceRecordResponse.from(saved);
    }

    @Override
    @Transactional
    public List<AttendanceCalendarDayResponse> getCalendarDay(Long userId, LocalDate date) {
        Student student = resolveStudent(userId);
        ensurePastClassesMarked(student);

        List<AttendanceCorrection> pendingCorrections = attendanceCorrectionRepository.findByStudentIdAndStatus(student.getId(), CorrectionStatus.PENDING);
        Map<Long, AttendanceCorrection> pendingByAttendanceId = pendingCorrections.stream()
                .filter(c -> c.getAttendance() != null)
                .collect(Collectors.toMap(c -> c.getAttendance().getId(), c -> c, (c1, c2) -> c1));

        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());
        List<AttendanceCalendarDayResponse> marked = attendances.stream()
                .filter(a -> a.getDailyClass().getDate().toLocalDate().equals(date))
                .map(a -> {
                    AttendanceCorrection pending = pendingByAttendanceId.get(a.getId());
                    boolean correctionPending = pending != null;
                    AttendStatus reqStatus = pending != null ? pending.getRequestedStatus() : null;
                    return new AttendanceCalendarDayResponse(
                            a.getId(),
                            a.getDailyClass().getId(),
                            a.getDailyClass().getTitle(),
                            a.getDailyClass().getBatch() != null ? a.getDailyClass().getBatch().getTrainerId() : null,
                            a.getDailyClass().getDate(),
                            a.getDailyClass().getStatus(),
                            a.getStatus(),
                            a.getMarkedAt(),
                            a.getDailyClass().getMeetLink(),
                            a.getDailyClass().getRecordingUrl(),
                            null,
                            correctionPending,
                            reqStatus
                    );
                })
                .toList();

        // Classes scheduled for the student's batches that day but never marked at all for
        // this student — attendanceId is null so the frontend can offer "Request
        // Correction" for a genuinely missing record, not just a wrong one.
        List<Long> markedClassIds = marked.stream().map(AttendanceCalendarDayResponse::classId).toList();
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);

        List<Batch> activeBatches = enrollmentRepository.findActiveBatchesByStudentId(student.getId());
        List<Long> batchIds = activeBatches.stream().map(Batch::getId).toList();

        List<DailyClass> candidateClasses = batchIds.isEmpty() ? List.of()
                : dailyClassRepository.findByBatchIdInAndDateBetweenOrderByDateAsc(batchIds, dayStart, dayEnd);

        List<AttendanceCalendarDayResponse> unmarked = candidateClasses.stream()
                .filter(c -> !markedClassIds.contains(c.getId()))
                .map(c -> new AttendanceCalendarDayResponse(
                        null, c.getId(), c.getTitle(),
                        c.getBatch() != null ? c.getBatch().getTrainerId() : null,
                        c.getDate(), c.getStatus(), null, null,
                        c.getMeetLink(), c.getRecordingUrl(), null))
                .toList();

        // Scheduled Class (Zoom) sessions visible to the student that day, which never
        // got linked to a DailyClass at all (attendance never knew they happened) —
        // surfaced separately from the two categories above via meetingLinkId so the
        // frontend can offer "Report Missing Attendance" even for these.
        List<AttendanceCalendarDayResponse> scheduledClassOnly = new ArrayList<>();
        Set<Long> seenMeetingIds = new HashSet<>();
        for (Batch b : activeBatches) {
            Long bId = b.getId();
            Long cId = b.getCourse() != null ? b.getCourse().getId() : null;
            List<MeetingLink> list = meetingLinkRepository.findVisibleToStudentOnDate(bId, cId, dayStart, dayEnd);
            for (MeetingLink m : list) {
                if (m.getDailyClass() == null && seenMeetingIds.add(m.getId())) {
                    scheduledClassOnly.add(new AttendanceCalendarDayResponse(
                            null, null, m.getTitle(), null, m.getScheduledStart(), null, null, null,
                            m.getMeetUrl(), null, m.getId()));
                }
            }
        }

        return Stream.concat(Stream.concat(marked.stream(), unmarked.stream()), scheduledClassOnly.stream()).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceOverviewItemResponse> getAttendanceOverview() {
        List<Batch> batches = batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(Batch::isActive)
                .toList();

        List<AttendanceOverviewItemResponse> list = new ArrayList<>();
        for (Batch batch : batches) {
            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            List<DailyClass> classes = dailyClassRepository.findByBatchIdAndStatusOrderByDateDesc(batch.getId(), ClassStatus.COMPLETED);
            List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batch.getId());

            int totalStudents = students.size();
            int totalClasses = classes.size();

            int totalPresent = 0, totalAbsent = 0, totalLate = 0;

            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

            int lowAttCount = 0;
            int totalPctSum = 0;

            for (Student s : students) {
                List<Attendance> sAtt = byStudent.getOrDefault(s.getId(), List.of());
                int p = (int) sAtt.stream().filter(att -> att.getStatus() == AttendStatus.PRESENT).count();
                int ab = (int) sAtt.stream().filter(att -> att.getStatus() == AttendStatus.ABSENT).count();
                int lt = (int) sAtt.stream().filter(att -> att.getStatus() == AttendStatus.LATE).count();
                totalPresent += p;
                totalAbsent += ab;
                totalLate += lt;

                int studentTotal = sAtt.size();
                // Students with NO records count as 0% attendance
                int pct = studentTotal > 0 ? (int) Math.round((p * 100.0) / studentTotal) : 0;
                totalPctSum += pct;
                if (pct < 75) {
                    lowAttCount++;
                }
            }

            // Average across ALL enrolled students (0% for those with no records)
            int avgAttendance = totalStudents > 0 ? totalPctSum / totalStudents : 0;

            list.add(new AttendanceOverviewItemResponse(
                    batch.getId(),
                    batch.getName(),
                    batch.getCourse().getTitle(),
                    totalStudents,
                    totalClasses,
                    avgAttendance,
                    lowAttCount,
                    0,
                    totalPresent,
                    totalAbsent,
                    totalLate
            ));
        }

        return list;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceAnalyticsResponse getAttendanceAnalytics(Long batchId, Integer days) {
        int daysForDaily = days != null && days > 0 ? days : 30;
        LocalDateTime sinceDaily = LocalDateTime.now().minusDays(daysForDaily);
        int daysForHistory = Math.max(daysForDaily, 60);
        LocalDateTime sinceHistory = LocalDateTime.now().minusDays(daysForHistory);

        List<DailyClass> classes;
        List<DailyClass> historyClasses;

        if (batchId != null) {
            classes = dailyClassRepository.findByBatchIdAndStatusAndDateGreaterThanEqualOrderByDateAsc(batchId, ClassStatus.COMPLETED, sinceDaily);
            historyClasses = dailyClassRepository.findByBatchIdAndStatusAndDateGreaterThanEqualOrderByDateAsc(batchId, ClassStatus.COMPLETED, sinceHistory);
            if (classes.isEmpty()) {
                classes = dailyClassRepository.findByBatchIdAndDateGreaterThanEqualOrderByDateAsc(batchId, sinceDaily);
            }
            if (historyClasses.isEmpty()) {
                historyClasses = dailyClassRepository.findByBatchIdAndDateGreaterThanEqualOrderByDateAsc(batchId, sinceHistory);
            }
        } else {
            classes = dailyClassRepository.findByStatusAndDateGreaterThanEqualOrderByDateAsc(ClassStatus.COMPLETED, sinceDaily);
            historyClasses = dailyClassRepository.findByStatusAndDateGreaterThanEqualOrderByDateAsc(ClassStatus.COMPLETED, sinceHistory);
            if (classes.isEmpty()) {
                classes = dailyClassRepository.findByDateGreaterThanEqualOrderByDateAsc(sinceDaily);
            }
            if (historyClasses.isEmpty()) {
                historyClasses = dailyClassRepository.findByDateGreaterThanEqualOrderByDateAsc(sinceHistory);
            }
        }

        Set<Long> allClassIdSet = new HashSet<>();
        for (DailyClass c : classes) allClassIdSet.add(c.getId());
        for (DailyClass c : historyClasses) allClassIdSet.add(c.getId());

        List<Attendance> allAttendances = allClassIdSet.isEmpty() ? List.of() : attendanceRepository.findByDailyClassIdIn(new ArrayList<>(allClassIdSet));
        Map<Long, List<Attendance>> attByClass = allAttendances.stream()
                .collect(Collectors.groupingBy(a -> a.getDailyClass().getId()));

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("d MMM");

        List<AttendanceAnalyticsResponse.DailyTrendPoint> dailyTrend = new ArrayList<>();
        Map<String, AttendanceAnalyticsResponse.WeeklyTrendPoint> weeklyMap = new LinkedHashMap<>();
        Map<String, AttendanceAnalyticsResponse.MonthlyTrendPoint> monthlyMap = new LinkedHashMap<>();

        int totalPresent = 0, totalAbsent = 0, totalLate = 0, totalAll = 0;

        for (DailyClass cls : classes) {
            List<Attendance> classAtt = attByClass.getOrDefault(cls.getId(), List.of());
            int p = (int) classAtt.stream().filter(att -> att.getStatus() == AttendStatus.PRESENT).count();
            int ab = (int) classAtt.stream().filter(att -> att.getStatus() == AttendStatus.ABSENT).count();
            int lt = (int) classAtt.stream().filter(att -> att.getStatus() == AttendStatus.LATE).count();
            int total = classAtt.size();
            int pct = total > 0 ? (int) Math.round((p * 100.0) / total) : 0;

            totalPresent += p;
            totalAbsent += ab;
            totalLate += lt;
            totalAll += total;

            dailyTrend.add(new AttendanceAnalyticsResponse.DailyTrendPoint(
                    cls.getDate().format(dateFmt),
                    cls.getDate().format(labelFmt),
                    cls.getTitle(),
                    cls.getBatch().getName(),
                    p, ab, lt, total, pct,
                    cls.getDate().format(labelFmt)
            ));
        }

        for (DailyClass cls : historyClasses) {
            List<Attendance> classAtt = attByClass.getOrDefault(cls.getId(), List.of());
            int p = (int) classAtt.stream().filter(att -> att.getStatus() == AttendStatus.PRESENT).count();
            int ab = (int) classAtt.stream().filter(att -> att.getStatus() == AttendStatus.ABSENT).count();
            int lt = (int) classAtt.stream().filter(att -> att.getStatus() == AttendStatus.LATE).count();
            int total = classAtt.size();
            int pct = total > 0 ? (int) Math.round((p * 100.0) / total) : 0;

            int weekNumber = cls.getDate().get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            String weekKey = cls.getDate().getYear() + "-W" + (weekNumber < 10 ? "0" + weekNumber : weekNumber);
            String weekLabel = "W" + weekNumber;

            weeklyMap.merge(weekKey,
                    new AttendanceAnalyticsResponse.WeeklyTrendPoint(weekLabel, p, ab, lt, total, pct),
                    (existing, added) -> {
                        int np = existing.present() + added.present();
                        int na = existing.absent() + added.absent();
                        int nl = existing.late() + added.late();
                        int nt = existing.total() + added.total();
                        int npct = nt > 0 ? (int) Math.round((np * 100.0) / nt) : 0;
                        return new AttendanceAnalyticsResponse.WeeklyTrendPoint(existing.week(), np, na, nl, nt, npct);
                    });

            String monthKey = cls.getDate().format(DateTimeFormatter.ofPattern("yyyy-MM"));
            String monthLabel = cls.getDate().format(DateTimeFormatter.ofPattern("MMM yy"));

            monthlyMap.merge(monthKey,
                    new AttendanceAnalyticsResponse.MonthlyTrendPoint(monthLabel, p, ab, lt, total, pct),
                    (existing, added) -> {
                        int np = existing.present() + added.present();
                        int na = existing.absent() + added.absent();
                        int nl = existing.late() + added.late();
                        int nt = existing.total() + added.total();
                        int npct = nt > 0 ? (int) Math.round((np * 100.0) / nt) : 0;
                        return new AttendanceAnalyticsResponse.MonthlyTrendPoint(existing.month(), np, na, nl, nt, npct);
                    });
        }

        int overallPct = totalAll > 0 ? (int) Math.round((totalPresent * 100.0) / totalAll) : 0;

        // 1. Attendance by Class Mode (Online vs Offline)
        int onlinePresent = 0, onlineAll = 0, onlineConducted = 0, onlineTotal = 0;
        int offlinePresent = 0, offlineAll = 0, offlineConducted = 0, offlineTotal = 0;

        List<DailyClass> allTimeframeClasses = batchId != null
                ? dailyClassRepository.findByBatchIdAndDateGreaterThanEqualOrderByDateAsc(batchId, sinceDaily)
                : dailyClassRepository.findByDateGreaterThanEqualOrderByDateAsc(sinceDaily);

        if (allTimeframeClasses.isEmpty()) {
            allTimeframeClasses = batchId != null
                    ? dailyClassRepository.findByBatchIdOrderByDateDesc(batchId)
                    : dailyClassRepository.findAll();
        }

        for (DailyClass cls : allTimeframeClasses) {
            boolean isOnline = (cls.getBatch() != null && cls.getBatch().getMode() == com.careerlabs.lms.api.batch.entity.BatchMode.ONLINE)
                    || (cls.getMeetLink() != null && !cls.getMeetLink().isBlank());
            List<Attendance> classAtt = attByClass.getOrDefault(cls.getId(), List.of());
            boolean isConducted = cls.getStatus() == ClassStatus.COMPLETED || !classAtt.isEmpty();

            if (isOnline) {
                onlineTotal++;
                if (isConducted) {
                    onlineConducted++;
                    onlinePresent += (int) classAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                    onlineAll += classAtt.size();
                }
            } else {
                offlineTotal++;
                if (isConducted) {
                    offlineConducted++;
                    offlinePresent += (int) classAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                    offlineAll += classAtt.size();
                }
            }
        }
        int onlineAvgPct = onlineAll > 0 ? (int) Math.round((onlinePresent * 100.0) / onlineAll) : (onlineConducted > 0 ? overallPct : 0);
        int offlineAvgPct = offlineAll > 0 ? (int) Math.round((offlinePresent * 100.0) / offlineAll) : (offlineConducted > 0 ? overallPct : 0);
        AttendanceAnalyticsResponse.ModeAttendance modeAttendance = new AttendanceAnalyticsResponse.ModeAttendance(
                onlineAvgPct, onlineConducted, Math.max(onlineTotal, onlineConducted),
                offlineAvgPct, offlineConducted, Math.max(offlineTotal, offlineConducted)
        );


        // 2. Trainer Performance
        Map<String, int[]> trainerStats = new HashMap<>(); // [conducted, present, total]
        Map<String, Long> trainerIdsByName = new HashMap<>();

        Set<Long> trainerIdSet = new HashSet<>();
        for (DailyClass cls : classes) {
            if (cls.getBatch() != null && cls.getBatch().getTrainerId() != null) {
                trainerIdSet.add(cls.getBatch().getTrainerId());
            }
        }
        Map<Long, String> trainerNames = trainerIdSet.isEmpty() ? Map.of() : userRepository.findAllById(trainerIdSet).stream()
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toMap(User::getId, User::getName, (e1, e2) -> e1));

        for (DailyClass cls : classes) {
            String trainerName = null;
            Long tId = null;
            if (cls.getBatch() != null && cls.getBatch().getTrainerId() != null) {
                tId = cls.getBatch().getTrainerId();
                trainerName = trainerNames.get(tId);
            }
            if (trainerName == null || trainerName.isBlank()) {
                trainerName = "Assigned Trainer";
            }
            if (tId != null) trainerIdsByName.put(trainerName, tId);

            int[] stats = trainerStats.computeIfAbsent(trainerName, k -> new int[3]);
            stats[0]++; // conducted
            List<Attendance> classAtt = attByClass.getOrDefault(cls.getId(), List.of());
            int p = (int) classAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
            stats[1] += p;
            stats[2] += classAtt.size();
        }

        List<AttendanceAnalyticsResponse.TrainerPerformancePoint> trainerPerformance = trainerStats.entrySet().stream()
                .map(e -> {
                    int cond = e.getValue()[0];
                    int p = e.getValue()[1];
                    int tot = e.getValue()[2];
                    int pct = tot > 0 ? (int) Math.round((p * 100.0) / tot) : 0;
                    return new AttendanceAnalyticsResponse.TrainerPerformancePoint(trainerIdsByName.get(e.getKey()), e.getKey(), cond, pct);
                })
                .sorted((a, b) -> Integer.compare(b.attendancePct(), a.attendancePct()))
                .toList();

        // 3. Batch Attendance
        Map<Long, String> batchNames = new HashMap<>();
        Map<Long, int[]> batchStats = new HashMap<>(); // [conducted, present, total]

        for (DailyClass cls : classes) {
            if (cls.getBatch() != null) {
                Long bId = cls.getBatch().getId();
                batchNames.putIfAbsent(bId, cls.getBatch().getName());
                int[] stats = batchStats.computeIfAbsent(bId, k -> new int[3]);
                stats[0]++;
                List<Attendance> classAtt = attByClass.getOrDefault(cls.getId(), List.of());
                stats[1] += (int) classAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                stats[2] += classAtt.size();
            }
        }

        List<AttendanceAnalyticsResponse.BatchAttendancePoint> batchAttendance = batchStats.entrySet().stream()
                .map(e -> {
                    int cond = e.getValue()[0];
                    int p = e.getValue()[1];
                    int tot = e.getValue()[2];
                    int pct = tot > 0 ? (int) Math.round((p * 100.0) / tot) : 0;
                    return new AttendanceAnalyticsResponse.BatchAttendancePoint(e.getKey(), batchNames.get(e.getKey()), cond, pct);
                })
                .sorted((a, b) -> Integer.compare(b.classesConducted(), a.classesConducted()))
                .toList();

        return new AttendanceAnalyticsResponse(
                dailyTrend,
                new ArrayList<>(weeklyMap.values()),
                new ArrayList<>(monthlyMap.values()),
                overallPct,
                totalPresent,
                totalAbsent,
                totalLate,
                totalAll,
                modeAttendance,
                trainerPerformance,
                batchAttendance
        );
    }


    @Override
    @Transactional(readOnly = true)
    public List<LowAttendanceStudentResponse> getLowAttendanceStudents(Double threshold, Long batchId) {
        double thresh = threshold != null ? threshold : 75.0;
        // Only scan active batches — completed batches should not generate new alerts
        List<Batch> batches = batchId != null ?
                batchRepository.findById(batchId)
                        .filter(Batch::isActive)
                        .map(List::of).orElse(List.of()) :
                batchRepository.findAllByOrderByCreatedAtDesc().stream()
                        .filter(Batch::isActive)
                        .toList();

        List<LowAttendanceStudentResponse> results = new ArrayList<>();

        for (Batch batch : batches) {
            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            List<DailyClass> classes = dailyClassRepository.findByBatchIdAndStatusOrderByDateDesc(batch.getId(), ClassStatus.COMPLETED);
            if (classes.isEmpty()) {
                classes = dailyClassRepository.findByBatchIdOrderByDateDesc(batch.getId());
            }
            int totalBatchClasses = classes.size();
            if (totalBatchClasses == 0) continue;

            List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batch.getId());
            Map<Long, List<Attendance>> byStudent = attendances.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

            for (Student student : students) {
                List<Attendance> sAtt = byStudent.getOrDefault(student.getId(), List.of());
                int recordedTotal = sAtt.size();
                int effectiveTotal = Math.max(recordedTotal, totalBatchClasses);
                if (effectiveTotal == 0) continue;

                int present = (int) sAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
                int absent = (int) sAtt.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
                int late = (int) sAtt.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();

                int pct = (int) Math.round((present * 100.0) / effectiveTotal);
                if (pct < thresh) {
                    int deficit = (int) Math.ceil((thresh / 100.0) * effectiveTotal - present);
                    if (deficit <= 0) deficit = 1;
                    String risk = pct < 50 ? "CRITICAL" : pct < 65 ? "HIGH" : "MEDIUM";

                    results.add(new LowAttendanceStudentResponse(
                            student.getId(),
                            student.getUser().getId(),
                            student.getUser().getName(),
                            student.getUser().getEmail(),
                            student.getPhone(),
                            student.getEnrollmentNo(),
                            batch.getId(),
                            batch.getName(),
                            batch.getCourse().getTitle(),
                            present, absent, late, effectiveTotal,
                            pct, deficit, risk
                    ));
                }
            }
        }

        results.sort(Comparator.comparingInt(LowAttendanceStudentResponse::percentage));
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceHistoryResponse getStudentAttendanceHistory(Long studentIdOrUserId) {
        Student student = studentRepository.findById(studentIdOrUserId)
                .orElseGet(() -> studentRepository.findByUserId(studentIdOrUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Student not found for ID: " + studentIdOrUserId)));

        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());

        int totalPresent = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
        int totalAbsent = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
        int totalLate = (int) attendances.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();
        int totalAll = attendances.size();
        int overallPct = totalAll > 0 ? (int) Math.round((totalPresent * 100.0) / totalAll) : 0;

        int streak = 0;
        for (Attendance a : attendances) {
            if (a.getStatus() == AttendStatus.PRESENT) streak++;
            else break;
        }

        Map<Long, List<Attendance>> byBatch = attendances.stream()
                .collect(Collectors.groupingBy(a -> a.getDailyClass().getBatch().getId()));

        List<AttendanceHistoryResponse.BatchAttendanceHistoryDto> batchHistories = new ArrayList<>();
        for (Map.Entry<Long, List<Attendance>> entry : byBatch.entrySet()) {
            List<Attendance> bAtt = entry.getValue();
            Batch batch = bAtt.get(0).getDailyClass().getBatch();

            int bp = (int) bAtt.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
            int ba = (int) bAtt.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
            int bl = (int) bAtt.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();
            int be = (int) bAtt.stream().filter(a -> a.getStatus() == AttendStatus.EXCUSED).count();
            int bt = bAtt.size();
            int bpct = bt > 0 ? (int) Math.round((bp * 100.0) / bt) : 0;

            List<AttendanceHistoryResponse.ClassRecordDto> records = bAtt.stream().map(a -> new AttendanceHistoryResponse.ClassRecordDto(
                    a.getDailyClass().getId(),
                    a.getDailyClass().getDate(),
                    a.getDailyClass().getTitle(),
                    a.getStatus(),
                    a.getMarkedAt()
            )).toList();

            batchHistories.add(new AttendanceHistoryResponse.BatchAttendanceHistoryDto(
                    batch.getId(), batch.getName(), batch.getCourse().getTitle(),
                    bp, ba, bl, be, bt, bpct, records
            ));
        }

        List<AttendanceHistoryResponse.RecentRecordDto> recent = attendances.stream().limit(50).map(a -> {
            String markerName = null;
            if (a.getMarkedBy() != null) {
                markerName = userRepository.findById(a.getMarkedBy())
                        .map(User::getName)
                        .orElse("User #" + a.getMarkedBy());
            }
            String courseTitle = (a.getDailyClass().getBatch() != null && a.getDailyClass().getBatch().getCourse() != null)
                    ? a.getDailyClass().getBatch().getCourse().getTitle() : null;
            return new AttendanceHistoryResponse.RecentRecordDto(
                    a.getId(),
                    a.getDailyClass().getId(),
                    a.getDailyClass().getDate(),
                    a.getDailyClass().getTitle(),
                    a.getDailyClass().getBatch() != null ? a.getDailyClass().getBatch().getName() : "—",
                    courseTitle,
                    a.getStatus(),
                    a.getRemarks(),
                    a.getMarkedBy(),
                    markerName,
                    a.getMarkedAt()
            );
        }).toList();

        List<AttendanceAuditLogResponse> auditLogs = attendanceAuditLogRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())
                .stream().map(AttendanceAuditLogResponse::from).toList();

        return new AttendanceHistoryResponse(
                new AttendanceHistoryResponse.StudentInfoDto(student.getId(), student.getUser().getId(), student.getUser().getName(), student.getUser().getEmail(), student.getEnrollmentNo()),
                overallPct, totalPresent, totalAbsent, totalLate, totalAll, streak,
                batchHistories, List.of(), recent, auditLogs
        );
    }

    @Override
    @Transactional(readOnly = true)
    public BatchAttendanceMatrixResponse getBatchAttendanceDetail(Long batchId, String month) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + batchId));

        List<DailyClass> classes = dailyClassRepository.findByBatchIdAndStatusOrderByDateAsc(batchId, ClassStatus.COMPLETED);
        if (month != null && !month.trim().isEmpty()) {
            try {
                java.time.YearMonth ym = java.time.YearMonth.parse(month.trim());
                classes = classes.stream()
                        .filter(c -> c.getDate() != null &&
                                     c.getDate().getYear() == ym.getYear() &&
                                     c.getDate().getMonthValue() == ym.getMonthValue())
                        .collect(Collectors.toList());
            } catch (Exception e) {
                LOGGER.warn("Failed to parse month filter '{}' in getBatchAttendanceDetail for batchId {}: {}", month, batchId, e.getMessage());
            }
        }
        List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batchId);

        List<Attendance> attendances = attendanceRepository.findByDailyClassBatchId(batchId);

        Map<String, Attendance> attMap = attendances.stream()
                .collect(Collectors.toMap(
                        a -> a.getStudent().getId() + "_" + a.getDailyClass().getId(),
                        a -> a,
                        (existing, replacement) -> existing
                ));

        List<BatchAttendanceMatrixResponse.ClassSummaryDto> classSummaries = new ArrayList<>();
        for (DailyClass cls : classes) {
            int p = 0, a = 0, l = 0;
            for (Student s : students) {
                Attendance att = attMap.get(s.getId() + "_" + cls.getId());
                if (att != null) {
                    if (att.getStatus() == AttendStatus.PRESENT) p++;
                    else if (att.getStatus() == AttendStatus.ABSENT) a++;
                    else if (att.getStatus() == AttendStatus.LATE) l++;
                }
            }
            int total = students.size();
            int pct = total > 0 ? (int) Math.round((p * 100.0) / total) : 0;
            classSummaries.add(new BatchAttendanceMatrixResponse.ClassSummaryDto(
                    cls.getId(), cls.getDate(), cls.getTitle(), cls.getStatus(),
                    p, a, l, total - (p + a + l), pct
            ));
        }

        List<BatchAttendanceMatrixResponse.StudentMatrixRowDto> matrix = new ArrayList<>();
        for (Student s : students) {
            Map<String, String> recs = new HashMap<>();
            int present = 0, total = 0;
            for (DailyClass cls : classes) {
                Attendance att = attMap.get(s.getId() + "_" + cls.getId());
                if (att != null) {
                    recs.put(String.valueOf(cls.getId()), att.getStatus().name());
                    total++;
                    if (att.getStatus() == AttendStatus.PRESENT) present++;
                } else {
                    recs.put(String.valueOf(cls.getId()), null);
                }
            }
            int pct = total > 0 ? (int) Math.round((present * 100.0) / total) : 0;
            matrix.add(new BatchAttendanceMatrixResponse.StudentMatrixRowDto(
                    s.getId(), s.getUser().getName(), s.getUser().getEmail(), s.getEnrollmentNo(),
                    present, total, pct, recs
            ));
        }

        return new BatchAttendanceMatrixResponse(
                new BatchAttendanceMatrixResponse.BatchInfoDto(batch.getId(), batch.getName(), batch.getCourse().getTitle()),
                classSummaries, matrix
        );
    }

    @Override
    @Transactional
    public List<AttendanceAlertResponse> getAttendanceAlerts(Boolean resolved, Long batchId) {
        boolean isRes = resolved != null && resolved;
        if (!isRes) {
            try {
                generateAttendanceAlerts(75.0);
            } catch (Exception e) {
                LOGGER.warn("Failed to auto-generate attendance alerts in getAttendanceAlerts: {}", e.getMessage(), e);
            }
        }
        List<AttendanceAlert> alerts = batchId != null ?
                attendanceAlertRepository.findByBatchIdAndIsResolvedOrderByCurrentPctAsc(batchId, isRes) :
                attendanceAlertRepository.findByIsResolvedOrderByCurrentPctAsc(isRes);

        return alerts.stream().map(this::toAttendanceAlertResponse).toList();
    }

    @Override
    @Transactional
    public Map<String, Object> generateAttendanceAlerts(Double threshold) {
        double thresh = threshold != null ? Math.max(0.0, Math.min(100.0, threshold)) : 75.0;
        List<LowAttendanceStudentResponse> lowStudents = getLowAttendanceStudents(thresh, null);

        int generated = 0;
        for (LowAttendanceStudentResponse s : lowStudents) {
            Optional<AttendanceAlert> existing = attendanceAlertRepository.findFirstByStudentIdAndBatchIdAndIsResolvedFalse(s.studentId(), s.batchId());
            if (existing.isEmpty()) {
                Student student = studentRepository.findById(s.studentId()).orElse(null);
                Batch batch = batchRepository.findById(s.batchId()).orElse(null);
                if (student == null || batch == null) continue;

                AttendanceAlert alert = new AttendanceAlert();
                alert.setStudent(student);
                alert.setBatch(batch);
                alert.setThreshold(thresh);
                alert.setCurrentPct((double) s.percentage());
                alert.setMessage(s.name() + " has " + s.percentage() + "% attendance in " + s.batchName() + ". Needs " + s.deficit() + " more class" + (s.deficit() > 1 ? "es" : "") + " to reach " + (int) thresh + "%.");
                attendanceAlertRepository.save(alert);

                try {
                    Notification notification = new Notification();
                    notification.setUser(student.getUser());
                    notification.setTitle("Low Attendance Alert");
                    notification.setBody("Your attendance is " + s.percentage() + "%. You need " + s.deficit() + " more class" + (s.deficit() > 1 ? "es" : "") + " to reach " + (int) thresh + "%. Please attend regularly.");
                    notification.setType(NotificationType.WARNING);
                    notification.setLink("/student/attendance");
                    notificationRepository.save(notification);
                } catch (Exception e) {
                    LOGGER.warn("Failed to save low attendance notification for studentId={}: {}", student.getId(), e.getMessage(), e);
                }

                generated++;
            } else {
                AttendanceAlert alert = existing.get();
                alert.setCurrentPct((double) s.percentage());
                alert.setThreshold(thresh);
                alert.setMessage(s.name() + " has " + s.percentage() + "% attendance in " + s.batchName() + ". Needs " + s.deficit() + " more class" + (s.deficit() > 1 ? "es" : "") + " to reach " + (int) thresh + "%.");
                attendanceAlertRepository.save(alert);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("generated", generated);
        result.put("checked", lowStudents.size());
        return result;
    }

    @Override
    @Transactional
    public AttendanceAlertResponse resolveAlert(Long alertId) {
        AttendanceAlert alert = attendanceAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceAlert not found with id: " + alertId));

        alert.setResolved(true);
        alert.setResolvedAt(Instant.now());
        AttendanceAlert saved = attendanceAlertRepository.save(alert);
        return toAttendanceAlertResponse(saved);
    }

    @Override
    @Transactional
    public StudentAttendanceSummaryResponse getStudentAttendanceSummary(Long userId) {
        return getStudentAttendanceSummary(userId, null);
    }

    @Override
    @Transactional
    public StudentAttendanceSummaryResponse getStudentAttendanceSummary(Long userId, String month) {
        Student student = resolveStudent(userId);
        ensurePastClassesMarked(student);
        LocalDate joiningDate = resolveJoiningDate(student);

        List<Attendance> allAttendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());

        List<Attendance> validAttendances = allAttendances.stream()
                .filter(a -> a.getDailyClass() != null && a.getDailyClass().getDate() != null)
                .toList();

        // Calculate overall metrics
        int overallPresent = (int) validAttendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
        int overallAbsent = (int) validAttendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
        int overallLate = (int) validAttendances.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();
        int overallExcused = (int) validAttendances.stream().filter(a -> a.getStatus() == AttendStatus.LEAVE || a.getStatus() == AttendStatus.EXCUSED).count();
        int overallTotal = validAttendances.size();
        int overallEffectiveTotal = overallPresent + overallAbsent + overallLate;
        int overallPercentage = overallEffectiveTotal > 0 ? (int) Math.round(((overallPresent + overallLate) * 100.0) / overallEffectiveTotal) : 0;

        // Month-filtered metrics if month parameter provided (e.g. "2026-09")
        List<Attendance> monthAttendances = validAttendances;
        if (month != null && !month.isBlank()) {
            monthAttendances = validAttendances.stream()
                    .filter(a -> a.getDailyClass().getDate().format(DateTimeFormatter.ofPattern("yyyy-MM")).equals(month))
                    .toList();
        }

        int present = (int) monthAttendances.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
        int absent = (int) monthAttendances.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
        int late = (int) monthAttendances.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();
        int excused = (int) monthAttendances.stream().filter(a -> a.getStatus() == AttendStatus.LEAVE || a.getStatus() == AttendStatus.EXCUSED).count();
        int total = monthAttendances.size();

        int effectiveTotal = present + absent + late;
        int percentage = effectiveTotal > 0 ? (int) Math.round(((present + late) * 100.0) / effectiveTotal) : 0;

        int neededFor75 = 0;
        if (overallPercentage < 75 && overallEffectiveTotal > 0) {
            double raw = (0.75 * overallEffectiveTotal - (overallPresent + overallLate)) / 0.25;
            neededFor75 = Math.max(0, (int) Math.ceil(raw));
        }

        // Calculate consecutive attendance streak descending from most recent class
        int streak = 0;
        for (Attendance a : validAttendances) {
            if (a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.LATE) {
                streak++;
            } else if (a.getStatus() == AttendStatus.ABSENT) {
                break;
            }
        }

        int trendWindow = 5;
        List<Attendance> recent = validAttendances.size() > trendWindow
                ? validAttendances.subList(0, trendWindow)
                : validAttendances;
        int recentPresent = (int) recent.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.LATE).count();
        int recentCountable = (int) recent.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.ABSENT || a.getStatus() == AttendStatus.LATE).count();
        int currentPercentage = recentCountable > 0 ? (int) Math.round((recentPresent * 100.0) / recentCountable) : overallPercentage;

        List<Attendance> priorToRecent = validAttendances.size() > trendWindow
                ? validAttendances.subList(trendWindow, Math.min(trendWindow * 2, validAttendances.size()))
                : List.of();
        int priorPresent = (int) priorToRecent.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.LATE).count();
        int priorCountable = (int) priorToRecent.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT || a.getStatus() == AttendStatus.ABSENT || a.getStatus() == AttendStatus.LATE).count();
        int previousPercentage = priorCountable > 0 ? (int) Math.round((priorPresent * 100.0) / priorCountable) : currentPercentage;

        int improvement = currentPercentage - previousPercentage;
        RiskLevel riskLevel = overallEffectiveTotal == 0 ? RiskLevel.HEALTHY : (overallPercentage >= 75 ? RiskLevel.HEALTHY : (overallPercentage >= 60 ? RiskLevel.AT_RISK : RiskLevel.CRITICAL));

        return new StudentAttendanceSummaryResponse(
                present,
                absent,
                late,
                excused,
                total,
                percentage,
                neededFor75,
                streak,
                joiningDate,
                previousPercentage,
                currentPercentage,
                improvement,
                riskLevel,
                overallPercentage,
                overallTotal
        );
    }

    @Override
    @Transactional
    public List<AttendanceAnalyticsResponse.DailyTrendPoint> getStudentAttendanceTrend(Long userId) {
        Student student = resolveStudent(userId);
        ensurePastClassesMarked(student);

        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());
        if (attendances.isEmpty()) {
            return List.of();
        }

        // Sort ascending by class date
        List<Attendance> sorted = attendances.stream()
                .filter(a -> a.getDailyClass() != null && a.getDailyClass().getDate() != null)
                .sorted(Comparator.comparing(a -> a.getDailyClass().getDate()))
                .toList();

        if (sorted.isEmpty()) {
            return List.of();
        }

        LocalDate earliestDate = sorted.get(0).getDailyClass().getDate().toLocalDate();
        LocalDate joiningDate = student.getJoiningDate();
        if (joiningDate != null && joiningDate.isBefore(earliestDate)) {
            earliestDate = joiningDate;
        }

        WeekFields weekFields = WeekFields.of(DayOfWeek.MONDAY, 1);
        Map<String, List<Attendance>> groupedByWeek = new LinkedHashMap<>();
        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("d MMM");

        for (Attendance a : sorted) {
            LocalDate date = a.getDailyClass().getDate().toLocalDate();
            LocalDate monday = date.with(weekFields.dayOfWeek(), 1);
            // Never start a week before the student's earliest class or joining date
            LocalDate effectiveWeekStart = monday.isBefore(earliestDate) ? earliestDate : monday;
            String weekLabel = effectiveWeekStart.format(labelFmt);
            groupedByWeek.computeIfAbsent(weekLabel, k -> new ArrayList<>()).add(a);
        }

        List<AttendanceAnalyticsResponse.DailyTrendPoint> trend = new ArrayList<>();
        int weekIndex = 1;
        for (Map.Entry<String, List<Attendance>> entry : groupedByWeek.entrySet()) {
            List<Attendance> weekAtts = entry.getValue();
            int present = (int) weekAtts.stream().filter(a -> a.getStatus() == AttendStatus.PRESENT).count();
            int absent = (int) weekAtts.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).count();
            int late = (int) weekAtts.stream().filter(a -> a.getStatus() == AttendStatus.LATE).count();
            int total = weekAtts.size();
            int pct = total > 0 ? (int) Math.round((present * 100.0) / total) : 0;

            LocalDate firstInWeek = weekAtts.stream()
                    .map(a -> a.getDailyClass().getDate().toLocalDate())
                    .min(Comparator.naturalOrder())
                    .orElse(null);
            String dateLabel = firstInWeek != null ? firstInWeek.format(labelFmt) : entry.getKey();
            String weekName = "W" + weekIndex + " (" + dateLabel + ")";
            String dateStr = firstInWeek != null ? firstInWeek.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : weekAtts.get(0).getDailyClass().getDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            String batchName = weekAtts.get(0).getDailyClass().getBatch() != null ? weekAtts.get(0).getDailyClass().getBatch().getName() : "General";

            trend.add(new AttendanceAnalyticsResponse.DailyTrendPoint(
                    dateStr,
                    dateLabel,
                    "Weekly Summary (" + total + " classes)",
                    batchName,
                    present,
                    absent,
                    late,
                    total,
                    pct,
                    weekName
            ));
            weekIndex++;
        }

        return trend;
    }

    @Override
    @Transactional
    public List<AttendanceHistoryResponse.RecentRecordDto> getStudentAttendanceRecords(Long userId, String month) {
        Student student = resolveStudent(userId);
        ensurePastClassesMarked(student);

        List<AttendanceCorrection> pendingCorrections = attendanceCorrectionRepository.findByStudentIdAndStatus(student.getId(), CorrectionStatus.PENDING);
        Map<Long, AttendanceCorrection> pendingByAttendanceId = pendingCorrections.stream()
                .filter(c -> c.getAttendance() != null)
                .collect(Collectors.toMap(c -> c.getAttendance().getId(), c -> c, (c1, c2) -> c1));

        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());

        if (month != null && !month.isBlank()) {
            attendances = attendances.stream()
                    .filter(a -> a.getDailyClass().getDate().format(DateTimeFormatter.ofPattern("yyyy-MM")).equals(month))
                    .toList();
        }

        return attendances.stream().map(a -> {
            String markerName = null;
            if (a.getMarkedBy() != null) {
                markerName = userRepository.findById(a.getMarkedBy())
                        .map(User::getName)
                        .orElse("User #" + a.getMarkedBy());
            }
            String courseTitle = (a.getDailyClass().getBatch() != null && a.getDailyClass().getBatch().getCourse() != null)
                    ? a.getDailyClass().getBatch().getCourse().getTitle() : null;
            AttendanceCorrection pending = pendingByAttendanceId.get(a.getId());
            boolean correctionPending = pending != null;
            AttendStatus reqStatus = pending != null ? pending.getRequestedStatus() : null;
            return new AttendanceHistoryResponse.RecentRecordDto(
                    a.getId(),
                    a.getDailyClass().getId(),
                    a.getDailyClass().getDate(),
                    a.getDailyClass().getTitle(),
                    a.getDailyClass().getBatch() != null ? a.getDailyClass().getBatch().getName() : "General",
                    courseTitle,
                    a.getStatus(),
                    a.getRemarks(),
                    a.getMarkedBy(),
                    markerName,
                    a.getMarkedAt(),
                    correctionPending,
                    reqStatus
            );
        }).toList();
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

    private LocalDate resolveJoiningDate(Student student) {
        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());
        LocalDate earliestAttendance = attendances.stream()
                .filter(a -> a.getDailyClass() != null && a.getDailyClass().getDate() != null)
                .map(a -> a.getDailyClass().getDate().toLocalDate())
                .min(Comparator.naturalOrder())
                .orElse(null);

        LocalDate candidate = student.getJoiningDate();
        if (candidate == null) {
            List<Batch> activeBatches = enrollmentRepository.findActiveBatchesByStudentId(student.getId());
            candidate = activeBatches.stream()
                    .map(Batch::getStartDate)
                    .filter(java.util.Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);
        }
        if (candidate == null && student.getCreatedAt() != null) {
            candidate = student.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        if (candidate == null) {
            candidate = earliestAttendance != null ? earliestAttendance : LocalDate.now();
        }

        // If candidate date is AFTER the earliest recorded attendance, reconcile to earliest attendance
        if (earliestAttendance != null && earliestAttendance.isBefore(candidate)) {
            candidate = earliestAttendance;
        }

        if (student.getJoiningDate() == null || !candidate.equals(student.getJoiningDate())) {
            student.setJoiningDate(candidate);
            studentRepository.save(student);
        }
        return candidate;
    }

    @Override
    @Transactional
    public void ensurePastClassesMarkedForUser(Long userId) {
        Student student = resolveStudent(userId);
        ensurePastClassesMarked(student);
    }

    private void ensurePastClassesMarked(Student student) {
        if (student == null) {
            return;
        }

        List<Batch> activeBatches = enrollmentRepository.findActiveBatchesByStudentId(student.getId());
        if (activeBatches.isEmpty()) {
            return;
        }

        // 1. Ensure Scheduled Classes (MeetingLink) strictly for the student's active batches have DailyClass linked
        for (Batch batch : activeBatches) {
            List<MeetingLink> batchMeetings = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(batch.getId());
            for (MeetingLink m : batchMeetings) {
                if (m.getBatch() != null) {
                    DailyClass dc = m.getDailyClass();
                    if (dc == null) {
                        dc = new DailyClass();
                        dc.setBatch(m.getBatch());
                        dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
                        dc.setTitle(m.getTitle() != null && !m.getTitle().isBlank() ? m.getTitle() : "Scheduled Class");
                        dc.setMeetLink(m.getMeetUrl());
                        dc.setStatus(m.getStatus() == MeetingStatus.COMPLETED ? ClassStatus.COMPLETED : ClassStatus.SCHEDULED);
                        dc = dailyClassRepository.save(dc);
                        m.setDailyClass(dc);
                        meetingLinkRepository.save(m);
                    } else {
                        boolean changed = false;
                        if (m.getStatus() == MeetingStatus.COMPLETED && dc.getStatus() != ClassStatus.COMPLETED) {
                            dc.setStatus(ClassStatus.COMPLETED);
                            changed = true;
                        }
                        if (m.getScheduledStart() != null && !m.getScheduledStart().equals(dc.getDate())) {
                            dc.setDate(m.getScheduledStart());
                            changed = true;
                        }
                        if (changed) {
                            dailyClassRepository.save(dc);
                        }
                    }
                }
            }
        }

        // 2. For each active batch of this student, find past real classes and ensure attendance records
        LocalDateTime now = LocalDateTime.now();
        List<Attendance> existingAttendances = attendanceRepository.findByStudentIdOrderByDailyClassDateDesc(student.getId());
        Map<Long, Attendance> attendanceByClassId = existingAttendances.stream()
                .filter(a -> a.getDailyClass() != null)
                .collect(Collectors.toMap(a -> a.getDailyClass().getId(), a -> a, (a1, a2) -> a1));

        for (Batch batch : activeBatches) {
            List<DailyClass> pastRealClasses = dailyClassRepository.findByBatchIdOrderByDateDesc(batch.getId()).stream()
                    .filter(c -> c.getDate() != null && (c.getDate().isBefore(now) || c.getStatus() == ClassStatus.COMPLETED))
                    .toList();

            for (DailyClass dc : pastRealClasses) {
                Attendance existing = attendanceByClassId.get(dc.getId());
                if (existing == null) {
                    attendanceRepository.upsertAttendance(
                            student.getId(),
                            dc.getId(),
                            AttendStatus.ABSENT.name(),
                            Instant.now(),
                            null,
                            "Auto-marked ABSENT (past class without record)"
                    );
                }
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceHistoryPageResponse getAttendanceHistory(
            LocalDate from, LocalDate to, Long batchId, Long courseId, Long classId, Long studentId,
            AttendStatus status, String search, int page, int limit) {
        Specification<Attendance> spec = buildAttendanceHistorySpecification(from, to, batchId, courseId, classId, studentId, status, search);
        PageRequest pageRequest = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "dailyClass.date", "id"));
        Page<Attendance> result = attendanceRepository.findAll(spec, pageRequest);

        List<AttendanceHistoryRowResponse> rows = result.getContent().stream()
                .map(att -> {
                    String markerName = null;
                    if (att.getMarkedBy() != null) {
                        markerName = userRepository.findById(att.getMarkedBy())
                                .map(User::getName)
                                .orElse("User #" + att.getMarkedBy());
                    }
                    return AttendanceHistoryRowResponse.from(att, markerName);
                })
                .toList();

        return new AttendanceHistoryPageResponse(rows, result.getTotalElements(), page, result.getTotalPages());
    }

    private Specification<Attendance> buildAttendanceHistorySpecification(
            LocalDate from, LocalDate to, Long batchId, Long courseId, Long classId, Long studentId,
            AttendStatus status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dailyClass").get("date"), from.atStartOfDay()));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dailyClass").get("date"), to.atTime(23, 59, 59)));
            }
            if (batchId != null) {
                predicates.add(cb.equal(root.get("dailyClass").get("batch").get("id"), batchId));
            }
            if (courseId != null) {
                predicates.add(cb.equal(root.get("dailyClass").get("batch").get("course").get("id"), courseId));
            }
            if (classId != null) {
                predicates.add(cb.equal(root.get("dailyClass").get("id"), classId));
            }
            if (studentId != null) {
                predicates.add(cb.equal(root.get("student").get("id"), studentId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("student").get("user").get("name")), pattern),
                        cb.like(cb.lower(root.get("student").get("user").get("email")), pattern),
                        cb.like(cb.lower(root.get("student").get("enrollmentNo")), pattern)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private DailyClassResponse toDailyClassResponse(DailyClass cls) {
        List<Attendance> attendances = attendanceRepository.findByDailyClassId(cls.getId());
        int p = (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.PRESENT).count();
        int ab = (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.ABSENT).count();
        int lt = (int) attendances.stream().filter(att -> att.getStatus() == AttendStatus.LATE).count();

        int totalStudents = cls.getBatch() != null ?
                (int) enrollmentRepository.countByBatchIdAndActiveTrue(cls.getBatch().getId()) : 0;

        return new DailyClassResponse(
                cls.getId(),
                cls.getBatch().getId(),
                cls.getBatch().getName(),
                cls.getBatch().getCourse().getTitle(),
                cls.getDate(),
                cls.getTitle(),
                cls.getNotes(),
                cls.getRecordingUrl(),
                cls.getMeetLink(),
                cls.getStatus(),
                cls.getCreatedAt(),
                p, ab, lt, totalStudents
        );
    }

    private AttendanceAlertResponse toAttendanceAlertResponse(AttendanceAlert alert) {
        return new AttendanceAlertResponse(
                alert.getId(),
                alert.getStudent().getId(),
                alert.getStudent().getUser().getId(),
                alert.getStudent().getUser().getName(),
                alert.getStudent().getUser().getEmail(),
                alert.getStudent().getPhone(),
                alert.getBatch().getId(),
                alert.getBatch().getName(),
                alert.getBatch().getCourse().getTitle(),
                alert.getThreshold(),
                alert.getCurrentPct(),
                alert.getMessage(),
                alert.isResolved(),
                alert.getCreatedAt(),
                alert.getResolvedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceAuditLogResponse> getStudentAuditLogs(Long studentIdOrUserId) {
        Student student = studentRepository.findById(studentIdOrUserId)
                .orElseGet(() -> studentRepository.findByUserId(studentIdOrUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Student not found for ID: " + studentIdOrUserId)));
        return attendanceAuditLogRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())
                .stream().map(AttendanceAuditLogResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceAuditLogResponse> getAuditLogs(Long studentId, Long classId) {
        if (studentId != null || classId != null) {
            return attendanceAuditLogRepository.searchAuditLogs(studentId, classId)
                    .stream().map(AttendanceAuditLogResponse::from).toList();
        }
        return attendanceAuditLogRepository.findTop100ByOrderByCreatedAtDesc()
                .stream().map(AttendanceAuditLogResponse::from).toList();
    }
}
