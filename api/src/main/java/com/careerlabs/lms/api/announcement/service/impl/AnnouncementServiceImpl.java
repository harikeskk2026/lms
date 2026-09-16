package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementRequest;
import com.careerlabs.lms.api.announcement.dto.request.AudiencePreviewRequest;
import com.careerlabs.lms.api.announcement.dto.request.ScheduleRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementAnalyticsResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementSuggestionResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementVersionResponse;
import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementAcknowledgment;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.entity.AnnouncementVersion;
import com.careerlabs.lms.api.announcement.entity.AnnouncementView;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementVersionRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementAnalyticsService;
import com.careerlabs.lms.api.announcement.service.AnnouncementAudienceService;
import com.careerlabs.lms.api.announcement.service.AnnouncementPlaceholderResolver;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;

@Service
public class AnnouncementServiceImpl implements AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementVersionRepository versionRepository;
    private final AnnouncementViewRepository viewRepository;
    private final AnnouncementAcknowledgmentRepository acknowledgmentRepository;
    private final AnnouncementCommentRepository commentRepository;
    private final BatchRepository batchRepository;
    private final CollegeRepository collegeRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final NotificationService notificationService;
    private final AnnouncementAudienceService audienceService;
    private final AnnouncementAnalyticsService analyticsService;
    private final AnnouncementPlaceholderResolver placeholderResolver;

    public AnnouncementServiceImpl(AnnouncementRepository announcementRepository,
                                    AnnouncementVersionRepository versionRepository,
                                    AnnouncementViewRepository viewRepository,
                                    AnnouncementAcknowledgmentRepository acknowledgmentRepository,
                                    AnnouncementCommentRepository commentRepository,
                                    BatchRepository batchRepository,
                                    CollegeRepository collegeRepository,
                                    CourseRepository courseRepository,
                                    UserRepository userRepository,
                                    StudentRepository studentRepository,
                                    EnrollmentRepository enrollmentRepository,
                                    AttendanceRepository attendanceRepository,
                                    NotificationService notificationService,
                                    AnnouncementAudienceService audienceService,
                                    AnnouncementAnalyticsService analyticsService,
                                    AnnouncementPlaceholderResolver placeholderResolver) {
        this.announcementRepository = announcementRepository;
        this.versionRepository = versionRepository;
        this.viewRepository = viewRepository;
        this.acknowledgmentRepository = acknowledgmentRepository;
        this.commentRepository = commentRepository;
        this.batchRepository = batchRepository;
        this.collegeRepository = collegeRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.notificationService = notificationService;
        this.audienceService = audienceService;
        this.analyticsService = analyticsService;
        this.placeholderResolver = placeholderResolver;
    }

    // ─── Admin listing ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementResponse> list(AnnouncementStatus statusFilter) {
        List<Announcement> announcements = statusFilter != null
                ? announcementRepository.findByStatus(statusFilter)
                : announcementRepository.findAllByOrderByPinnedDescCreatedAtDesc();

        return announcements.stream()
                .sorted(Comparator.comparing(Announcement::isPinned).reversed()
                        .thenComparing(Announcement::getCreatedAt, Comparator.reverseOrder()))
                .map(AnnouncementResponse::from)
                .toList();
    }

    // ─── Student listing (audience-filtered + personalized) ────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementResponse> listForStudent(Long userId) {
        LocalDate today = LocalDate.now();
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user " + userId));
        Map<String, String> vars = placeholderResolver.variablesFor(student);

        java.util.Set<Long> viewedIds = student.getId() != null
                ? new java.util.HashSet<>(viewRepository.findAnnouncementIdsByStudentId(student.getId()))
                : java.util.Collections.emptySet();
        java.util.Set<Long> acknowledgedIds = student.getId() != null
                ? new java.util.HashSet<>(acknowledgmentRepository.findAnnouncementIdsByStudentId(student.getId()))
                : java.util.Collections.emptySet();

        List<AnnouncementResponse> result = new ArrayList<>();
        List<Announcement> published = announcementRepository.findActiveByStatus(AnnouncementStatus.PUBLISHED, today);

        for (Announcement a : published) {
            if (!audienceService.isEligible(a, student)) {
                continue;
            }
            String title = placeholderResolver.resolve(a.getTitle(), vars);
            String body = placeholderResolver.resolve(a.getBody(), vars);
            boolean viewed = viewedIds.contains(a.getId());
            boolean acknowledged = acknowledgedIds.contains(a.getId());
            result.add(AnnouncementResponse.from(a, title, body, viewed, acknowledged));
        }

        result.sort(Comparator.comparing(AnnouncementResponse::isPinned).reversed()
                .thenComparing(AnnouncementResponse::createdAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public void requireRecipientAccess(Long announcementId, Long userId) {
        Announcement announcement = findOrThrow(announcementId);
        if (announcement.getStatus() != AnnouncementStatus.PUBLISHED) {
            throw new ForbiddenException("Announcement is not available to students");
        }
        if (announcement.getExpiresAt() != null && announcement.getExpiresAt().isBefore(LocalDate.now())) {
            throw new ForbiddenException("Announcement has expired");
        }
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ForbiddenException("Not authorized to access this announcement"));
        if (!audienceService.isEligible(announcement, student)) {
            throw new ForbiddenException("You are not in the audience for this announcement");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public long estimateAudience(AudiencePreviewRequest request) {
        Announcement preview = new Announcement();
        preview.setBatch(request.batchId() != null ? findBatch(request.batchId()) : null);
        preview.setCollege(request.collegeId() != null ? findCollege(request.collegeId()) : null);
        preview.setCourse(request.courseId() != null ? findCourse(request.courseId()) : null);
        preview.setAudienceRuleType(request.audienceRuleType() != null ? request.audienceRuleType() : AudienceRuleType.NONE);
        preview.setAudienceRuleValue(request.audienceRuleValue());
        preview.setAudienceRuleReferenceId(request.audienceRuleReferenceId());
        return audienceService.countEligibleStudents(preview);
    }

    private boolean isPureGlobal(Announcement a) {
        return a.getBatch() == null && a.getCollege() == null && a.getCourse() == null
                && (a.getAudienceRuleType() == null || a.getAudienceRuleType() == AudienceRuleType.NONE);
    }

    // ─── Create / update ─────────────────────────────────────────────────────

    @Override
    @Transactional
    public AnnouncementResponse create(AnnouncementRequest request, Long createdByUserId) {
        User createdBy = requireUser(createdByUserId);

        Announcement announcement = new Announcement();
        announcement.setCreatedBy(createdBy);
        applyRequest(announcement, request);

        AnnouncementStatus status = request.status() != null ? request.status() : AnnouncementStatus.PUBLISHED;
        validateScheduling(status, announcement.getScheduledAt());
        validateExpiry(status, announcement.getScheduledAt(), announcement.getExpiresAt());
        announcement.setStatus(status);

        Announcement saved = announcementRepository.save(announcement);
        saveVersionSnapshot(saved, createdBy);

        if (status == AnnouncementStatus.PUBLISHED) {
            fanOut(saved);
        }

        return AnnouncementResponse.from(saved);
    }

    @Override
    @Transactional
    public AnnouncementResponse update(Long id, AnnouncementRequest request, Long changedByUserId) {
        Announcement announcement = findOrThrow(id);
        User changedBy = requireUser(changedByUserId);

        AnnouncementStatus previousStatus = announcement.getStatus();
        applyRequest(announcement, request);

        AnnouncementStatus newStatus = request.status() != null ? request.status() : previousStatus;
        validateScheduling(newStatus, announcement.getScheduledAt());
        validateExpiry(newStatus, announcement.getScheduledAt(), announcement.getExpiresAt());
        announcement.setStatus(newStatus);

        Announcement saved = announcementRepository.save(announcement);
        saveVersionSnapshot(saved, changedBy);

        if (previousStatus != AnnouncementStatus.PUBLISHED && newStatus == AnnouncementStatus.PUBLISHED) {
            fanOut(saved);
        }

        return AnnouncementResponse.from(saved);
    }

    private void validateScheduling(AnnouncementStatus status, Instant scheduledAt) {
        if (status == AnnouncementStatus.SCHEDULED) {
            if (scheduledAt == null) {
                throw new BadRequestException("scheduledAt is required when status is SCHEDULED");
            }
            if (scheduledAt.isBefore(Instant.now().minusSeconds(60))) {
                throw new BadRequestException("Scheduled time must be in the future");
            }
        }
    }

    private void validateExpiry(AnnouncementStatus status, Instant scheduledAt, LocalDate expiresAt) {
        if (expiresAt == null) {
            return;
        }
        LocalDate publishDate;
        if (status == AnnouncementStatus.SCHEDULED && scheduledAt != null) {
            publishDate = scheduledAt.atZone(ZoneId.systemDefault()).toLocalDate();
            if (expiresAt.isBefore(publishDate)) {
                throw new BadRequestException("Expiry date cannot be before the scheduled publishing date (" + publishDate + ")");
            }
        } else {
            publishDate = LocalDate.now();
            if (expiresAt.isBefore(publishDate)) {
                throw new BadRequestException("Expiry date cannot be before the published date");
            }
        }
    }

    // ─── Lifecycle actions ───────────────────────────────────────────────────

    @Override
    @Transactional
    public AnnouncementResponse publish(Long id) {
        Announcement announcement = findOrThrow(id);
        if (announcement.getStatus() == AnnouncementStatus.PUBLISHED) {
            throw new BadRequestException("Announcement is already published");
        }
        validateExpiry(AnnouncementStatus.PUBLISHED, null, announcement.getExpiresAt());
        announcement.setStatus(AnnouncementStatus.PUBLISHED);
        Announcement saved = announcementRepository.save(announcement);
        fanOut(saved);
        return AnnouncementResponse.from(saved);
    }

    @Override
    @Transactional
    public AnnouncementResponse schedule(Long id, ScheduleRequest request) {
        Announcement announcement = findOrThrow(id);
        if (announcement.getStatus() == AnnouncementStatus.PUBLISHED) {
            throw new BadRequestException("Cannot schedule an already-published announcement");
        }
        if (request.scheduledAt() == null) {
            throw new BadRequestException("scheduledAt is required when status is SCHEDULED");
        }
        if (request.scheduledAt().isBefore(Instant.now().minusSeconds(60))) {
            throw new BadRequestException("Scheduled time must be in the future");
        }
        validateExpiry(AnnouncementStatus.SCHEDULED, request.scheduledAt(), announcement.getExpiresAt());
        announcement.setScheduledAt(request.scheduledAt());
        announcement.setStatus(AnnouncementStatus.SCHEDULED);
        return AnnouncementResponse.from(announcementRepository.save(announcement));
    }

    @Override
    @Transactional
    public AnnouncementResponse submitForApproval(Long id) {
        Announcement announcement = findOrThrow(id);
        if (announcement.getStatus() != AnnouncementStatus.DRAFT) {
            throw new BadRequestException("Only draft announcements can be submitted for approval");
        }
        announcement.setStatus(AnnouncementStatus.PENDING_APPROVAL);
        return AnnouncementResponse.from(announcementRepository.save(announcement));
    }

    @Override
    @Transactional
    public AnnouncementResponse approve(Long id, Long approverUserId) {
        Announcement announcement = findOrThrow(id);
        if (announcement.getStatus() != AnnouncementStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Only pending-approval announcements can be approved");
        }
        announcement.setApprovedBy(requireUser(approverUserId));
        announcement.setApprovedAt(Instant.now());

        boolean scheduledForLater = announcement.getScheduledAt() != null
                && announcement.getScheduledAt().isAfter(Instant.now());
        if (scheduledForLater) {
            validateExpiry(AnnouncementStatus.SCHEDULED, announcement.getScheduledAt(), announcement.getExpiresAt());
            announcement.setStatus(AnnouncementStatus.SCHEDULED);
            return AnnouncementResponse.from(announcementRepository.save(announcement));
        }

        validateExpiry(AnnouncementStatus.PUBLISHED, null, announcement.getExpiresAt());
        announcement.setStatus(AnnouncementStatus.PUBLISHED);
        Announcement saved = announcementRepository.save(announcement);
        fanOut(saved);
        return AnnouncementResponse.from(saved);
    }

    @Override
    @Transactional
    public AnnouncementResponse reject(Long id) {
        Announcement announcement = findOrThrow(id);
        if (announcement.getStatus() != AnnouncementStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Only pending-approval announcements can be rejected");
        }
        announcement.setStatus(AnnouncementStatus.DRAFT);
        return AnnouncementResponse.from(announcementRepository.save(announcement));
    }

    @Override
    @Transactional
    public AnnouncementResponse duplicate(Long id, Long createdByUserId) {
        Announcement source = findOrThrow(id);
        User createdBy = requireUser(createdByUserId);

        Announcement copy = new Announcement();
        copy.setCreatedBy(createdBy);
        copy.setTitle(source.getTitle() + " (Copy)");
        copy.setBody(source.getBody());
        copy.setBatch(source.getBatch());
        copy.setPinned(false);
        copy.setExpiresAt(source.getExpiresAt() != null && source.getExpiresAt().isAfter(LocalDate.now())
                ? source.getExpiresAt() : null);
        copy.setCategory(source.getCategory());
        copy.setPriority(source.getPriority());
        copy.setRequiresAcknowledgment(source.isRequiresAcknowledgment());
        copy.setAllowComments(source.isAllowComments());
        copy.setActionType(source.getActionType());
        copy.setActionReferenceId(source.getActionReferenceId());
        copy.setActionLabel(source.getActionLabel());
        copy.setActionUrl(source.getActionUrl());
        copy.setAttachmentUrl(source.getAttachmentUrl());
        copy.setAttachmentName(source.getAttachmentName());
        copy.setCollege(source.getCollege());
        copy.setCourse(source.getCourse());
        copy.setAudienceRuleType(source.getAudienceRuleType());
        copy.setAudienceRuleValue(source.getAudienceRuleValue());
        copy.setAudienceRuleReferenceId(source.getAudienceRuleReferenceId());
        copy.setStatus(AnnouncementStatus.DRAFT);

        Announcement saved = announcementRepository.save(copy);
        saveVersionSnapshot(saved, createdBy);
        return AnnouncementResponse.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!announcementRepository.existsById(id)) {
            throw new ResourceNotFoundException("Announcement not found: " + id);
        }
        commentRepository.clearParentCommentsByAnnouncementId(id);
        commentRepository.deleteAllByAnnouncementId(id);
        acknowledgmentRepository.deleteAllByAnnouncementId(id);
        viewRepository.deleteAllByAnnouncementId(id);
        versionRepository.deleteAllByAnnouncementId(id);
        announcementRepository.deleteById(id);
    }

    // ─── Analytics / history ─────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AnnouncementAnalyticsResponse analytics(Long id) {
        return analyticsService.analyticsFor(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementVersionResponse> history(Long id) {
        findOrThrow(id);
        return versionRepository.findByAnnouncementIdOrderByVersionNumberDesc(id).stream()
                .map(AnnouncementVersionResponse::from)
                .toList();
    }

    // ─── Student engagement ──────────────────────────────────────────────────

    @Override
    @Transactional
    public void recordView(Long announcementId, Long userId) {
        requireRecipientAccess(announcementId, userId);
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user " + userId));
        if (viewRepository.existsByAnnouncementIdAndStudentId(announcementId, student.getId())) {
            return;
        }
        Announcement announcement = findOrThrow(announcementId);
        AnnouncementView view = new AnnouncementView();
        view.setAnnouncement(announcement);
        view.setStudent(student);
        viewRepository.save(view);
    }

    @Override
    @Transactional
    public AnnouncementResponse acknowledge(Long announcementId, Long userId) {
        requireRecipientAccess(announcementId, userId);
        Announcement announcement = findOrThrow(announcementId);
        if (!announcement.isRequiresAcknowledgment()) {
            throw new BadRequestException("This announcement does not require acknowledgment");
        }
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user " + userId));
        if (acknowledgmentRepository.existsByAnnouncementIdAndStudentId(announcementId, student.getId())) {
            throw new BadRequestException("Already acknowledged");
        }
        try {
            AnnouncementAcknowledgment ack = new AnnouncementAcknowledgment();
            ack.setAnnouncement(announcement);
            ack.setStudent(student);
            acknowledgmentRepository.save(ack);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Concurrent double-submit safe
            return AnnouncementResponse.from(announcement);
        }
        return AnnouncementResponse.from(announcement);
    }



    // ─── Suggestions ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementSuggestionResponse> suggestions() {
        List<AnnouncementSuggestionResponse> suggestions = new ArrayList<>();

        for (Batch batch : batchRepository.findAllByOrderByCreatedAtDesc()) {
            if (!batch.isActive()) {
                continue;
            }
            List<Student> students = enrollmentRepository.findActiveStudentsByBatchId(batch.getId());
            long lowAttendanceCount = students.stream()
                    .filter(s -> {
                        if (s.getId() == null) return false;
                        long total = attendanceRepository.countByStudentId(s.getId());
                        if (total == 0) {
                            return false;
                        }
                        long present = attendanceRepository.countByStudentIdAndStatus(s.getId(), AttendStatus.PRESENT);
                        return present * 100.0 / total < 75.0;
                    })
                    .count();

            if (lowAttendanceCount > 0) {
                suggestions.add(new AnnouncementSuggestionResponse(
                        "Attendance Warning - " + batch.getName(),
                        "Attendance for several students in this batch has fallen below the required 75%. "
                                 + "Please ensure you attend upcoming sessions to remain eligible.",
                        AnnouncementCategory.ATTENDANCE,
                        batch.getId(),
                        batch.getName(),
                        lowAttendanceCount + " student(s) in this batch have attendance below 75%."));
            }
        }
        return suggestions;
    }

    // ─── Notification fan-out ────────────────────────────────────────────────

    private void fanOut(Announcement announcement) {
        NotificationType type = (announcement.getPriority() == AnnouncementPriority.CRITICAL
                || announcement.getPriority() == AnnouncementPriority.HIGH)
                ? NotificationType.URGENT : NotificationType.INFO;

        boolean hasTokens = (announcement.getTitle() != null && announcement.getTitle().contains("{{"))
                || (announcement.getBody() != null && announcement.getBody().contains("{{"));

        boolean advancedTargeting = announcement.getCollege() != null
                || announcement.getCourse() != null
                || (announcement.getAudienceRuleType() != null && announcement.getAudienceRuleType() != AudienceRuleType.NONE)
                || hasTokens;

        if (!advancedTargeting) {
            if (announcement.getBatch() != null) {
                notificationService.notifyBatch(announcement.getBatch().getId(), announcement.getTitle(),
                        announcement.getBody(), type, "/student/announcements");
            } else {
                notificationService.notifyAllStudents(announcement.getTitle(), announcement.getBody(),
                        type, "/student/announcements");
            }
            return;
        }

        for (Student student : audienceService.resolveEligibleStudents(announcement)) {
            if (student.getUser() != null) {
                String title = announcement.getTitle();
                String body = announcement.getBody();
                if (hasTokens) {
                    Map<String, String> vars = placeholderResolver.variablesFor(student);
                    title = placeholderResolver.resolve(title, vars);
                    body = placeholderResolver.resolve(body, vars);
                }
                notificationService.notifyUser(student.getUser().getId(), title,
                        body, type, "/student/announcements");
            }
        }
    }

    // ─── Shared helpers ──────────────────────────────────────────────────────

    private void applyRequest(Announcement announcement, AnnouncementRequest request) {
        announcement.setTitle(request.title());
        announcement.setBody(request.body());
        announcement.setPinned(request.isPinned());
        announcement.setExpiresAt(request.expiresAt());
        announcement.setCategory(request.category() != null ? request.category() : AnnouncementCategory.GENERAL);
        announcement.setPriority(request.priority() != null ? request.priority() : AnnouncementPriority.NORMAL);
        announcement.setScheduledAt(request.scheduledAt());
        announcement.setRequiresAcknowledgment(request.requiresAcknowledgment());
        announcement.setAllowComments(request.allowComments());
        announcement.setActionType(request.actionType());
        announcement.setActionReferenceId(request.actionReferenceId());
        announcement.setActionLabel(request.actionLabel());
        announcement.setActionUrl(request.actionUrl());
        announcement.setAttachmentUrl(request.attachmentUrl());
        announcement.setAttachmentName(request.attachmentName());
        announcement.setAudienceRuleType(request.audienceRuleType() != null ? request.audienceRuleType() : AudienceRuleType.NONE);
        announcement.setAudienceRuleValue(request.audienceRuleValue());
        announcement.setAudienceRuleReferenceId(request.audienceRuleReferenceId());

        announcement.setBatch(request.batchId() != null
                ? findBatch(request.batchId()) : null);
        announcement.setCollege(request.collegeId() != null
                ? findCollege(request.collegeId()) : null);
        announcement.setCourse(request.courseId() != null
                ? findCourse(request.courseId()) : null);
    }

    private void saveVersionSnapshot(Announcement announcement, User changedBy) {
        int nextVersion = versionRepository.countByAnnouncementId(announcement.getId()) + 1;
        AnnouncementVersion version = new AnnouncementVersion();
        version.setAnnouncement(announcement);
        version.setVersionNumber(nextVersion);
        version.setTitle(announcement.getTitle());
        version.setContent(announcement.getBody());
        version.setCategory(announcement.getCategory());
        version.setPriority(announcement.getPriority());
        version.setChangedBy(changedBy);
        versionRepository.save(version);
    }

    private Announcement findOrThrow(Long id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + id));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private Batch findBatch(Long id) {
        return batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + id));
    }

    private College findCollege(Long id) {
        return collegeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("College not found: " + id));
    }

    private Course findCourse(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }
}
