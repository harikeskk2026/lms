package com.careerlabs.lms.api.attendance;

import com.careerlabs.lms.api.attendance.dto.DailyClassRequest;
import com.careerlabs.lms.api.attendance.dto.DailyClassResponse;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.AttendanceAlertRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceAuditLogRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.attendance.service.impl.AttendanceServiceImpl;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchAuthorizationGuard;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.repository.UserRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClassAuthorizationTest {

    @Mock DailyClassRepository dailyClassRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock AttendanceAlertRepository attendanceAlertRepository;
    @Mock AttendanceCorrectionRepository attendanceCorrectionRepository;
    @Mock BatchRepository batchRepository;
    @Mock StudentRepository studentRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock MeetingLinkRepository meetingLinkRepository;
    @Mock MeetingAttendeeRepository meetingAttendeeRepository;
    @Mock AttendanceAuditLogRepository attendanceAuditLogRepository;

    BatchAuthorizationGuard batchAuthGuard;
    AttendanceServiceImpl attendanceService;

    Course course1;
    Batch trainerABatch, trainerBBatch;
    DailyClass classA, classB;

    JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ADMIN");
    JwtUserPrincipal superAdminPrincipal = new JwtUserPrincipal(2L, "superadmin@test.com", "SUPERADMIN");
    JwtUserPrincipal trainerAPrincipal = new JwtUserPrincipal(10L, "trainerA@test.com", "TRAINER");
    JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(50L, "student@test.com", "STUDENT");

    void setId(Object o, Long id) { ReflectionTestUtils.setField(o, "id", id); }

    @BeforeEach
    void setUp() {
        batchAuthGuard = new BatchAuthorizationGuard(batchRepository);
        attendanceService = new AttendanceServiceImpl(
                dailyClassRepository, attendanceRepository, attendanceAlertRepository,
                attendanceCorrectionRepository, batchRepository, studentRepository,
                enrollmentRepository, notificationRepository, userRepository,
                meetingLinkRepository, meetingAttendeeRepository, attendanceAuditLogRepository,
                batchAuthGuard);

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

        classA = new DailyClass();
        setId(classA, 1001L);
        classA.setBatch(trainerABatch);
        classA.setTitle("Class A");
        classA.setDate(LocalDateTime.now());

        classB = new DailyClass();
        setId(classB, 1002L);
        classB.setBatch(trainerBBatch);
        classB.setTitle("Class B");
        classB.setDate(LocalDateTime.now());
    }

    @Test
    @DisplayName("Trainer creates class for own batch -> allowed")
    void trainerCreate_ownBatch_allowed() {
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(dailyClassRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyClassRequest req = new DailyClassRequest(100L, LocalDateTime.now(), "Test Class", null, null, null, null);
        DailyClassResponse res = attendanceService.createClass(req, trainerAPrincipal);
        assertNotNull(res);
    }

    @Test
    @DisplayName("Trainer creates class for another trainer's batch -> 403")
    void trainerCreate_otherBatch_forbidden() {
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        DailyClassRequest req = new DailyClassRequest(200L, LocalDateTime.now(), "Test Class", null, null, null, null);
        assertThrows(ForbiddenException.class, () -> attendanceService.createClass(req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer views attendance sheet for own class -> allowed")
    void trainerGetSheet_ownClass_allowed() {
        when(dailyClassRepository.findById(1001L)).thenReturn(Optional.of(classA));
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(enrollmentRepository.findActiveStudentsByBatchId(100L)).thenReturn(List.of());
        when(attendanceRepository.findByDailyClassId(1001L)).thenReturn(List.of());

        assertDoesNotThrow(() -> attendanceService.getAttendanceSheet(1001L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer views attendance sheet for another trainer's class -> 403")
    void trainerGetSheet_otherClass_forbidden() {
        when(dailyClassRepository.findById(1002L)).thenReturn(Optional.of(classB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class, () -> attendanceService.getAttendanceSheet(1002L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer updates own class -> allowed")
    void trainerUpdate_ownClass_allowed() {
        when(dailyClassRepository.findById(1001L)).thenReturn(Optional.of(classA));
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(dailyClassRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyClassRequest req = new DailyClassRequest(null, null, "Updated", null, null, null, null);
        assertDoesNotThrow(() -> attendanceService.updateClass(1001L, req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer updates another trainer's class -> 403")
    void trainerUpdate_otherClass_forbidden() {
        when(dailyClassRepository.findById(1002L)).thenReturn(Optional.of(classB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        DailyClassRequest req = new DailyClassRequest(null, null, "Hacked", null, null, null, null);
        assertThrows(ForbiddenException.class, () -> attendanceService.updateClass(1002L, req, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer deletes own class -> allowed")
    void trainerDelete_ownClass_allowed() {
        when(dailyClassRepository.findById(1001L)).thenReturn(Optional.of(classA));
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));
        when(meetingLinkRepository.findByDailyClassIn(any())).thenReturn(List.of());

        assertDoesNotThrow(() -> attendanceService.deleteClass(1001L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer deletes another trainer's class -> 403")
    void trainerDelete_otherClass_forbidden() {
        when(dailyClassRepository.findById(1002L)).thenReturn(Optional.of(classB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class, () -> attendanceService.deleteClass(1002L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Admin can update any class")
    void adminUpdate_anyClass_allowed() {
        when(dailyClassRepository.findById(1002L)).thenReturn(Optional.of(classB));
        when(dailyClassRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyClassRequest req = new DailyClassRequest(null, null, "Admin Update", null, null, null, null);
        assertDoesNotThrow(() -> attendanceService.updateClass(1002L, req, adminPrincipal));
    }

    @Test
    @DisplayName("SuperAdmin can delete any class")
    void superAdminDelete_anyClass_allowed() {
        when(dailyClassRepository.findById(1001L)).thenReturn(Optional.of(classA));
        when(meetingLinkRepository.findByDailyClassIn(any())).thenReturn(List.of());

        assertDoesNotThrow(() -> attendanceService.deleteClass(1001L, superAdminPrincipal));
    }

    @Test
    @DisplayName("Student cannot create class -> 403")
    void studentCreate_class_forbidden() {
        when(batchRepository.findById(100L)).thenReturn(Optional.of(trainerABatch));

        DailyClassRequest req = new DailyClassRequest(100L, LocalDateTime.now(), "Test", null, null, null, null);
        assertThrows(ForbiddenException.class, () -> attendanceService.createClass(req, studentPrincipal));
    }

    @Test
    @DisplayName("Trainer listing classes without batchId returns only assigned batches")
    void trainerList_scopedToOwnBatches() {
        when(batchRepository.findByTrainerId(10L)).thenReturn(List.of(trainerABatch));
        when(dailyClassRepository.findByBatchIdInAndDateBetweenOrderByDateAsc(
                eq(List.of(100L)), any(), any()))
                .thenReturn(List.of(classA));

        List<DailyClassResponse> result = attendanceService.getClasses(null, null, null, trainerAPrincipal);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Trainer listing classes with another trainer's batchId -> 403")
    void trainerList_otherBatchId_forbidden() {
        when(batchRepository.findByTrainerId(10L)).thenReturn(List.of(trainerABatch));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class,
                () -> attendanceService.getClasses(200L, null, null, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer accesses another trainer's attendance sheet -> 403")
    void trainerGetSheet_otherBatch_forbidden() {
        when(dailyClassRepository.findById(1002L)).thenReturn(Optional.of(classB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class,
                () -> attendanceService.getAttendanceSheet(1002L, trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer copy-previous from another trainer's class -> 403")
    void trainerCopyPrevious_otherClass_forbidden() {
        when(dailyClassRepository.findById(1002L)).thenReturn(Optional.of(classB));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(trainerBBatch));

        assertThrows(ForbiddenException.class,
                () -> attendanceService.getPreviousAttendanceSheet(1002L, trainerAPrincipal));
    }
}
