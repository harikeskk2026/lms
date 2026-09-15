package com.careerlabs.lms.api.meeting;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchAuthorizationGuard;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.meeting.dto.request.CreateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.request.UpdateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.response.MeetingLinkResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.meeting.service.impl.MeetingLinkSchedulerService;
import com.careerlabs.lms.api.meeting.service.impl.MeetingLinkServiceImpl;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.attendance.repository.AttendanceAuditLogRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MeetingAuthorizationTest {

    @Mock MeetingLinkRepository meetingLinkRepository;
    @Mock MeetingAttendeeRepository meetingAttendeeRepository;
    @Mock BatchRepository batchRepository;
    @Mock CourseRepository courseRepository;
    @Mock DailyClassRepository dailyClassRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock AttendanceCorrectionRepository attendanceCorrectionRepository;
    @Mock AttendanceAuditLogRepository attendanceAuditLogRepository;
    @Mock StudentRepository studentRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock MeetingLinkSchedulerService schedulerService;

    BatchAuthorizationGuard batchAuthGuard;
    MeetingLinkServiceImpl meetingService;

    Course course1;
    Batch trainerABatch, trainerBBatch;
    MeetingLink meetingA, meetingB;

    JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ADMIN");
    JwtUserPrincipal superAdminPrincipal = new JwtUserPrincipal(2L, "superadmin@test.com", "SUPERADMIN");
    JwtUserPrincipal trainerAPrincipal = new JwtUserPrincipal(10L, "trainerA@test.com", "TRAINER");
    JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(50L, "student@test.com", "STUDENT");

    void setId(Object o, Long id) { ReflectionTestUtils.setField(o, "id", id); }

    @BeforeEach
    void setUp() {
        batchAuthGuard = new BatchAuthorizationGuard(batchRepository);
        meetingService = new MeetingLinkServiceImpl(
                meetingLinkRepository, meetingAttendeeRepository, batchRepository,
                courseRepository, dailyClassRepository, attendanceRepository,
                attendanceCorrectionRepository, attendanceAuditLogRepository,
                studentRepository, enrollmentRepository, schedulerService, batchAuthGuard);

        course1 = new Course();
        setId(course1, 1L);
        course1.setTitle("Java Bootcamp");
        course1.setStatus(CourseStatus.PUBLISHED);

        trainerABatch = new Batch();
        setId(trainerABatch, 100L);
        trainerABatch.setName("Batch A");
        trainerABatch.setTrainerId(10L);
        trainerABatch.setCourse(course1);
        trainerABatch.setMode(BatchMode.ONLINE);
        trainerABatch.setActive(true);

        trainerBBatch = new Batch();
        setId(trainerBBatch, 200L);
        trainerBBatch.setName("Batch B");
        trainerBBatch.setTrainerId(20L);
        trainerBBatch.setCourse(course1);
        trainerBBatch.setMode(BatchMode.ONLINE);
        trainerBBatch.setActive(true);

        meetingA = new MeetingLink();
        setId(meetingA, 1001L);
        meetingA.setBatch(trainerABatch);
        meetingA.setCourse(course1);
        meetingA.setTitle("Meeting A");
        meetingA.setMeetUrl("https://zoom.us/1");
        meetingA.setScheduledStart(LocalDateTime.now().plusHours(1));
        meetingA.setStatus(MeetingStatus.SCHEDULED);

        meetingB = new MeetingLink();
        setId(meetingB, 1002L);
        meetingB.setBatch(trainerBBatch);
        meetingB.setCourse(course1);
        meetingB.setTitle("Meeting B");
        meetingB.setMeetUrl("https://zoom.us/2");
        meetingB.setScheduledStart(LocalDateTime.now().plusHours(1));
        meetingB.setStatus(MeetingStatus.SCHEDULED);
    }

    @Test
    @DisplayName("Trainer creates meeting for own batch -> allowed")
    void trainerCreate_ownBatch_allowed() {
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course1));
        when(dailyClassRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(meetingLinkRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        CreateMeetingLinkRequest req = new CreateMeetingLinkRequest();
        req.setTitle("Test");
        req.setMeetUrl("https://zoom.us/1");
        req.setBatchId(100L);
        req.setScheduledStart(LocalDateTime.now().plusHours(1));

        assertDoesNotThrow(() -> meetingService.createMeetingLink(req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer creates meeting for another trainer's batch -> 403")
    void trainerCreate_otherBatch_forbidden() {
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        CreateMeetingLinkRequest req = new CreateMeetingLinkRequest();
        req.setTitle("Test");
        req.setMeetUrl("https://zoom.us/1");
        req.setBatchId(200L);
        req.setScheduledStart(LocalDateTime.now().plusHours(1));

        assertThrows(ForbiddenException.class, () -> meetingService.createMeetingLink(req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer views own meeting -> allowed")
    void trainerGet_ownMeeting_allowed() {
        doNothing().when(schedulerService).autoTransitionStatuses(any());
        when(meetingLinkRepository.findById(1001L)).thenReturn(Optional.of(meetingA));
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));

        MeetingLinkResponse res = meetingService.getMeetingById(1001L, trainerAPrincipal);
        assertNotNull(res);
        assertEquals("Meeting A", res.title());
    }

    @Test
    @DisplayName("Trainer views another trainer's meeting -> 403")
    void trainerGet_otherMeeting_forbidden() {
        doNothing().when(schedulerService).autoTransitionStatuses(any());
        when(meetingLinkRepository.findById(1002L)).thenReturn(Optional.of(meetingB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class, () -> meetingService.getMeetingById(1002L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer updates own meeting -> allowed")
    void trainerUpdate_ownMeeting_allowed() {
        when(meetingLinkRepository.findById(1001L)).thenReturn(Optional.of(meetingA));
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(dailyClassRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(meetingLinkRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        UpdateMeetingLinkRequest req = new UpdateMeetingLinkRequest();
        req.setTitle("Updated Title");

        assertDoesNotThrow(() -> meetingService.updateMeetingLink(1001L, req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer updates another trainer's meeting -> 403")
    void trainerUpdate_otherMeeting_forbidden() {
        when(meetingLinkRepository.findById(1002L)).thenReturn(Optional.of(meetingB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        UpdateMeetingLinkRequest req = new UpdateMeetingLinkRequest();
        req.setTitle("Hacked");

        assertThrows(ForbiddenException.class, () -> meetingService.updateMeetingLink(1002L, req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer deletes own meeting -> allowed")
    void trainerDelete_ownMeeting_allowed() {
        when(meetingLinkRepository.findById(1001L)).thenReturn(Optional.of(meetingA));
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(meetingLinkRepository.findByDailyClassIn(any())).thenReturn(List.of());

        assertDoesNotThrow(() -> meetingService.deleteMeetingLink(1001L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer deletes another trainer's meeting -> 403")
    void trainerDelete_otherMeeting_forbidden() {
        when(meetingLinkRepository.findById(1002L)).thenReturn(Optional.of(meetingB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class, () -> meetingService.deleteMeetingLink(1002L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer changes another trainer's meeting status -> 403")
    void trainerStatusChange_otherMeeting_forbidden() {
        when(meetingLinkRepository.findById(1002L)).thenReturn(Optional.of(meetingB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class,
                () -> meetingService.updateMeetingStatus(1002L, MeetingStatus.COMPLETED, trainerAPrincipal));
    }

    @Test
    @DisplayName("Admin can view any meeting")
    void adminView_anyMeeting_allowed() {
        doNothing().when(schedulerService).autoTransitionStatuses(any());
        when(meetingLinkRepository.findById(1002L)).thenReturn(Optional.of(meetingB));

        MeetingLinkResponse res = meetingService.getMeetingById(1002L, adminPrincipal);
        assertNotNull(res);
    }

    @Test
    @DisplayName("SuperAdmin can delete any meeting")
    void superAdminDelete_anyMeeting_allowed() {
        when(meetingLinkRepository.findById(1001L)).thenReturn(Optional.of(meetingA));
        when(meetingLinkRepository.findByDailyClassIn(any())).thenReturn(List.of());

        assertDoesNotThrow(() -> meetingService.deleteMeetingLink(1001L, superAdminPrincipal));
    }

    @Test
    @DisplayName("Deleting completed meeting throws BadRequestException")
    void deleteCompletedMeeting_throwsBadRequest() {
        MeetingLink completedMeeting = new MeetingLink();
        setId(completedMeeting, 1005L);
        completedMeeting.setBatch(trainerABatch);
        completedMeeting.setStatus(MeetingStatus.COMPLETED);

        when(meetingLinkRepository.findById(1005L)).thenReturn(Optional.of(completedMeeting));

        assertThrows(com.careerlabs.lms.api.common.exception.BadRequestException.class,
                () -> meetingService.deleteMeetingLink(1005L, superAdminPrincipal));
    }

    @Test
    @DisplayName("Student cannot create meeting -> 403")
    void studentCreate_meeting_forbidden() {
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));

        CreateMeetingLinkRequest req = new CreateMeetingLinkRequest();
        req.setTitle("Test");
        req.setMeetUrl("https://zoom.us/1");
        req.setBatchId(100L);
        req.setScheduledStart(LocalDateTime.now().plusHours(1));

        assertThrows(ForbiddenException.class, () -> meetingService.createMeetingLink(req, studentPrincipal));
    }

    @Test
    @DisplayName("Trainer listing without batchId returns only own batches' meetings")
    void trainerList_scopedToOwnBatches() {
        doNothing().when(schedulerService).autoTransitionStatuses(any());
        when(batchRepository.findByTrainerId(10L)).thenReturn(List.of(trainerABatch));
        when(meetingLinkRepository.findByBatchIdInOrderByScheduledStartDesc(List.of(100L)))
                .thenReturn(List.of(meetingA));

        List<MeetingLinkResponse> result = meetingService.getAdminMeetings(null, null, trainerAPrincipal);

        assertEquals(1, result.size());
        assertEquals("Meeting A", result.get(0).title());
    }

    @Test
    @DisplayName("Trainer listing with another trainer's batchId -> 403")
    void trainerList_otherBatchId_forbidden() {
        when(batchRepository.findByTrainerId(10L)).thenReturn(List.of(trainerABatch));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class,
                () -> meetingService.getAdminMeetings(200L, null, trainerAPrincipal));
    }

    @Test
    @DisplayName("Creating duplicate meeting with same batch, time and title throws BadRequestException")
    void createDuplicateMeeting_throwsBadRequest() {
        LocalDateTime startTime = LocalDateTime.now().plusHours(2);
        MeetingLink existing = new MeetingLink();
        setId(existing, 2001L);
        existing.setBatch(trainerABatch);
        existing.setTitle("Duplicate Check");
        existing.setMeetUrl("https://zoom.us/duplicate");
        existing.setScheduledStart(startTime);
        existing.setStatus(MeetingStatus.SCHEDULED);

        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(100L)).thenReturn(List.of(existing));

        CreateMeetingLinkRequest req = new CreateMeetingLinkRequest();
        req.setTitle("Duplicate Check");
        req.setMeetUrl("https://zoom.us/other");
        req.setBatchId(100L);
        req.setScheduledStart(startTime);

        assertThrows(com.careerlabs.lms.api.common.exception.BadRequestException.class,
                () -> meetingService.createMeetingLink(req, trainerAPrincipal));
    }
}
