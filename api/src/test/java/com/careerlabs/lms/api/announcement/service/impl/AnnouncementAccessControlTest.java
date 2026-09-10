package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementRequest;
import com.careerlabs.lms.api.announcement.dto.request.AudiencePreviewRequest;
import com.careerlabs.lms.api.announcement.dto.request.ScheduleRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementVersionRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementAnalyticsService;
import com.careerlabs.lms.api.announcement.service.AnnouncementAudienceService;
import com.careerlabs.lms.api.announcement.service.AnnouncementPlaceholderResolver;
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
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnouncementAccessControlTest {

    @Mock
    private AnnouncementRepository announcementRepository;
    @Mock
    private AnnouncementVersionRepository versionRepository;
    @Mock
    private AnnouncementViewRepository viewRepository;
    @Mock
    private AnnouncementAcknowledgmentRepository acknowledgmentRepository;
    @Mock
    private AnnouncementCommentRepository commentRepository;
    @Mock
    private BatchRepository batchRepository;
    @Mock
    private CollegeRepository collegeRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AnnouncementAudienceService audienceService;
    @Mock
    private AnnouncementAnalyticsService analyticsService;
    @Mock
    private AnnouncementPlaceholderResolver placeholderResolver;

    @InjectMocks
    private AnnouncementServiceImpl announcementService;

    private Student student;
    private User studentUser;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    private Announcement announcement(Long id, AnnouncementStatus status, LocalDate expiresAt) {
        Announcement a = new Announcement();
        setId(a, id);
        a.setTitle("Title " + id);
        a.setBody("Body " + id);
        a.setStatus(status);
        a.setExpiresAt(expiresAt);
        a.setAudienceRuleType(AudienceRuleType.NONE);
        return a;
    }

    @BeforeEach
    void setUp() {
        studentUser = new User();
        setId(studentUser, 55L);
        studentUser.setRole(Role.STUDENT);

        student = new Student();
        setId(student, 100L);
        student.setUser(studentUser);
    }

    // ─── Student listing ───────────────────────────────────────────────────

    @Test
    @DisplayName("listForStudent returns only published, unexpired, audience-eligible announcements")
    void listForStudentFiltersByStatusExpiryAndAudience() {
        Announcement eligible = announcement(1L, AnnouncementStatus.PUBLISHED, null);
        Announcement expired = announcement(2L, AnnouncementStatus.PUBLISHED, LocalDate.now().minusDays(1));
        Announcement notEligible = announcement(3L, AnnouncementStatus.PUBLISHED, null);

        when(studentRepository.findByUserId(55L)).thenReturn(Optional.of(student));
        when(announcementRepository.findByStatus(AnnouncementStatus.PUBLISHED))
                .thenReturn(List.of(eligible, expired, notEligible));
        when(audienceService.isEligible(any(), any())).thenAnswer(inv -> inv.getArgument(0) == eligible);
        when(viewRepository.existsByAnnouncementIdAndStudentId(1L, 100L)).thenReturn(false);
        when(acknowledgmentRepository.existsByAnnouncementIdAndStudentId(1L, 100L)).thenReturn(false);

        List<AnnouncementResponse> result = announcementService.listForStudent(55L);

        assertEquals(List.of(1L), result.stream().map(AnnouncementResponse::id).toList());
        verify(viewRepository, never()).existsByAnnouncementIdAndStudentId(eq(2L), anyLong());
        verify(viewRepository, never()).existsByAnnouncementIdAndStudentId(eq(3L), anyLong());
    }

    @Test
    @DisplayName("FAIL CLOSED: listForStudent throws when the user has no student profile instead of leaking content")
    void listForStudentMissingStudentProfileFailsClosed() {
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> announcementService.listForStudent(55L));
    }

    // ─── Per-announcement recipient access ─────────────────────────────────

    @Test
    @DisplayName("requireRecipientAccess denies a non-published announcement")
    void requireRecipientAccessDeniesDraft() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.DRAFT, null)));

        assertThrows(ForbiddenException.class, () -> announcementService.requireRecipientAccess(1L, 55L));
    }

    @Test
    @DisplayName("requireRecipientAccess denies an expired announcement")
    void requireRecipientAccessDeniesExpired() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, LocalDate.now().minusDays(1))));

        assertThrows(ForbiddenException.class, () -> announcementService.requireRecipientAccess(1L, 55L));
    }

    @Test
    @DisplayName("requireRecipientAccess denies a user that is not in the audience")
    void requireRecipientAccessDeniesNonEligible() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.of(student));
        when(audienceService.isEligible(any(), eq(student))).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> announcementService.requireRecipientAccess(1L, 55L));
    }

    @Test
    @DisplayName("requireRecipientAccess denies when the user has no student profile")
    void requireRecipientAccessDeniesWithoutStudentProfile() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () -> announcementService.requireRecipientAccess(1L, 55L));
    }

    @Test
    @DisplayName("requireRecipientAccess allows an eligible recipient of a published, unexpired announcement")
    void requireRecipientAccessAllowsEligible() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.of(student));
        when(audienceService.isEligible(any(), eq(student))).thenReturn(true);

        assertDoesNotThrow(() -> announcementService.requireRecipientAccess(1L, 55L));
    }

    // ─── View & acknowledge ─────────────────────────────────────────────────

    @Test
    @DisplayName("recordView denies a non-eligible student and records nothing")
    void recordViewDeniesNonEligible() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.of(student));
        when(audienceService.isEligible(any(), eq(student))).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> announcementService.recordView(1L, 55L));
        verify(viewRepository, never()).save(any());
    }

    @Test
    @DisplayName("recordView records a view for an eligible recipient")
    void recordViewAllowsEligible() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));
        when(studentRepository.findByUserId(eq(55L))).thenReturn(Optional.of(student));
        when(audienceService.isEligible(any(), eq(student))).thenReturn(true);
        when(viewRepository.existsByAnnouncementIdAndStudentId(1L, 100L)).thenReturn(false);

        announcementService.recordView(1L, 55L);

        verify(viewRepository).save(any());
    }

    @Test
    @DisplayName("acknowledge denies a non-eligible student")
    void acknowledgeDeniesNonEligible() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.of(student));
        when(audienceService.isEligible(any(), eq(student))).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> announcementService.acknowledge(1L, 55L));
        verify(acknowledgmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("acknowledge allows an eligible recipient of an ack-required announcement")
    void acknowledgeAllowsEligible() {
        Announcement a = announcement(1L, AnnouncementStatus.PUBLISHED, null);
        a.setRequiresAcknowledgment(true);

        when(announcementRepository.findById(1L)).thenReturn(Optional.of(a));
        when(studentRepository.findByUserId(eq(55L))).thenReturn(Optional.of(student));
        when(audienceService.isEligible(any(), eq(student))).thenReturn(true);
        when(acknowledgmentRepository.existsByAnnouncementIdAndStudentId(1L, 100L)).thenReturn(false);

        AnnouncementResponse response = announcementService.acknowledge(1L, 55L);

        assertNotNull(response);
        assertEquals(1L, response.id());
        verify(acknowledgmentRepository).save(any());
    }

    // ─── Scheduling & delivery ──────────────────────────────────────────────

    @Test
    @DisplayName("schedule stores the chosen time and switches the status to SCHEDULED")
    void scheduleSetsScheduledStatusAndTime() {
        Announcement a = announcement(1L, AnnouncementStatus.DRAFT, null);
        when(announcementRepository.findById(1L)).thenReturn(Optional.of(a));
        when(announcementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Instant due = Instant.now().plusSeconds(3600);
        announcementService.schedule(1L, new ScheduleRequest(due));

        assertEquals(AnnouncementStatus.SCHEDULED, a.getStatus());
        assertEquals(due, a.getScheduledAt());
    }

    @Test
    @DisplayName("schedule refuses an already-published announcement")
    void scheduleRefusesPublished() {
        when(announcementRepository.findById(1L))
                .thenReturn(Optional.of(announcement(1L, AnnouncementStatus.PUBLISHED, null)));

        assertThrows(BadRequestException.class,
                () -> announcementService.schedule(1L, new ScheduleRequest(Instant.now().plusSeconds(3600))));
    }

    @Test
    @DisplayName("a scheduled announcement must not reach students (no fan-out) until it is published")
    void schedulingDoesNotFanOut() {
        Announcement a = announcement(1L, AnnouncementStatus.DRAFT, null);
        when(announcementRepository.findById(1L)).thenReturn(Optional.of(a));
        when(announcementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        announcementService.schedule(1L, new ScheduleRequest(Instant.now().plusSeconds(3600)));

        verify(notificationService, never()).notifyAllStudents(any(), any(), any(), any());
        verify(notificationService, never()).notifyBatch(anyLong(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("publishing a batch-targeted announcement delivers the notification to that batch")
    void publishBatchDeliversToBatch() {
        Batch batch = new Batch();
        setId(batch, 1L);
        Announcement a = announcement(1L, AnnouncementStatus.SCHEDULED, null);
        a.setBatch(batch);
        a.setPriority(AnnouncementPriority.NORMAL);

        when(announcementRepository.findById(1L)).thenReturn(Optional.of(a));
        when(announcementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AnnouncementResponse response = announcementService.publish(1L);

        assertEquals(AnnouncementStatus.PUBLISHED, response.status());
        verify(notificationService).notifyBatch(eq(1L), any(), any(),
                eq(NotificationType.INFO), eq("/student/announcements"));
    }

    @Test
    @DisplayName("publishing a global announcement delivers the notification to all students")
    void publishGlobalDeliversToAllStudents() {
        Announcement a = announcement(1L, AnnouncementStatus.SCHEDULED, null);
        a.setPriority(AnnouncementPriority.NORMAL);

        when(announcementRepository.findById(1L)).thenReturn(Optional.of(a));
        when(announcementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        announcementService.publish(1L);

        verify(notificationService).notifyAllStudents(any(), any(),
                eq(NotificationType.INFO), eq("/student/announcements"));
        verify(notificationService, never()).notifyBatch(anyLong(), any(), any(), any(), any());
    }

    // ─── Audience preview ───────────────────────────────────────────────────

    @Test
    @DisplayName("estimateAudience resolves the selected targeting and uses the audience service")
    void estimateAudienceCountsResolvedTargeting() {
        Batch batch = new Batch();
        setId(batch, 1L);
        College college = new College();
        setId(college, 2L);
        Course course = new Course();
        setId(course, 3L);

        when(batchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(collegeRepository.findById(2L)).thenReturn(Optional.of(college));
        when(courseRepository.findById(3L)).thenReturn(Optional.of(course));
        when(audienceService.countEligibleStudents(any())).thenReturn(17L);

        long count = announcementService.estimateAudience(
                new AudiencePreviewRequest(1L, 2L, 3L, AudienceRuleType.NONE, null, null));

        assertEquals(17L, count);
    }

    @Test
    @DisplayName("estimateAudience rejects an invalid target id (cannot reference a missing batch)")
    void estimateAudienceRejectsInvalidBatch() {
        when(batchRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> announcementService.estimateAudience(
                        new AudiencePreviewRequest(99L, null, null, AudienceRuleType.NONE, null, null)));
    }

    @Test
    @DisplayName("delete removes comments, acknowledgments, views, versions, and announcement")
    void deleteCleansUpRelatedEntitiesBeforeDeletingAnnouncement() {
        when(announcementRepository.existsById(2L)).thenReturn(true);

        announcementService.delete(2L);

        verify(commentRepository).clearParentCommentsByAnnouncementId(2L);
        verify(commentRepository).deleteAllByAnnouncementId(2L);
        verify(acknowledgmentRepository).deleteAllByAnnouncementId(2L);
        verify(viewRepository).deleteAllByAnnouncementId(2L);
        verify(versionRepository).deleteAllByAnnouncementId(2L);
        verify(announcementRepository).deleteById(2L);
    }

    @Test
    @DisplayName("delete throws ResourceNotFoundException when announcement does not exist")
    void deleteThrowsWhenNotFound() {
        when(announcementRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> announcementService.delete(999L));
        verify(announcementRepository, never()).deleteById(anyLong());
        verify(commentRepository, never()).deleteAllByAnnouncementId(anyLong());
    }

    // ─── Expiry date validation ───────────────────────────────────────────────

    @Test
    @DisplayName("create rejects announcement when expiresAt is today or in the past for immediate publish")
    void createRejectsExpiryDateOnOrBeforePublishedDate() {
        User adminUser = new User();
        setId(adminUser, 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        AnnouncementRequest req = new AnnouncementRequest(
                "Title", "Body", null, false, LocalDate.now(), null,
                AnnouncementStatus.PUBLISHED, null, null, false, false,
                null, null, null, null, null, null, null, null, null);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> announcementService.create(req, 1L));
        assertEquals("Expiry date must be after the published date", ex.getMessage());
    }

    @Test
    @DisplayName("create rejects announcement when expiresAt is before or on scheduled date")
    void createRejectsExpiryDateOnOrBeforeScheduledDate() {
        User adminUser = new User();
        setId(adminUser, 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        Instant scheduledTime = Instant.now().plusSeconds(86400 * 5);
        LocalDate scheduledDate = scheduledTime.atZone(java.time.ZoneId.systemDefault()).toLocalDate();

        AnnouncementRequest req = new AnnouncementRequest(
                "Title", "Body", null, false, scheduledDate, null,
                AnnouncementStatus.SCHEDULED, null, scheduledTime, false, false,
                null, null, null, null, null, null, null, null, null);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> announcementService.create(req, 1L));
        assertTrue(ex.getMessage().contains("Expiry date must be after the scheduled publishing date"));
    }

    @Test
    @DisplayName("schedule rejects new scheduled date when announcement expiresAt is on or before it")
    void scheduleRejectsScheduledDateAfterExpiry() {
        Announcement a = announcement(1L, AnnouncementStatus.DRAFT, LocalDate.now().plusDays(2));
        when(announcementRepository.findById(1L)).thenReturn(Optional.of(a));

        Instant scheduledTime = Instant.now().plusSeconds(86400 * 3);
        assertThrows(BadRequestException.class,
                () -> announcementService.schedule(1L, new ScheduleRequest(scheduledTime)));
    }
}