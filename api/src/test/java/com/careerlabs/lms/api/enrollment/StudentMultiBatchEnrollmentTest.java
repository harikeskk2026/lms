package com.careerlabs.lms.api.enrollment;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.impl.BatchServiceImpl;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.dto.response.StudentResponse;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentMultiBatchEnrollmentTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private BatchRepository batchRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private DailyClassRepository dailyClassRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    private BatchScheduleConflictValidator scheduleConflictValidator;
    private CourseAccessGuard accessGuard;
    private BatchServiceImpl batchService;

    private Student student;
    private JwtUserPrincipal studentPrincipal;
    private Course courseJava;
    private Course coursePython;
    private Course courseReact;
    private Batch batchJava;
    private Batch batchPython;
    private Batch batchReact;
    private Enrollment enrollmentJava;
    private Enrollment enrollmentPython;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        scheduleConflictValidator = new BatchScheduleConflictValidator(enrollmentRepository);
        accessGuard = new CourseAccessGuard(studentRepository, enrollmentRepository, batchRepository, courseRepository);
        batchService = new BatchServiceImpl(batchRepository, courseRepository, studentRepository, assignmentRepository,
                dailyClassRepository, userRepository, accessGuard, enrollmentRepository, transactionManager);

        User user = new User();
        setId(user, 10L);
        user.setName("MultiBatch Student");
        user.setEmail("multibatch@careerlabs.com");
        user.setRole(Role.STUDENT);
        user.setActive(true);

        studentPrincipal = new JwtUserPrincipal(10L, "multibatch@careerlabs.com", "STUDENT");

        student = new Student();
        setId(student, 100L);
        student.setUser(user);
        student.setEnrollmentNo("CL-MB-001");

        courseJava = new Course();
        setId(courseJava, 1L);
        courseJava.setTitle("Java Full Stack");
        courseJava.setStatus(CourseStatus.PUBLISHED);
        courseJava.setLevel(Level.INTERMEDIATE);

        coursePython = new Course();
        setId(coursePython, 2L);
        coursePython.setTitle("Python Data Science");
        coursePython.setStatus(CourseStatus.PUBLISHED);
        coursePython.setLevel(Level.BEGINNER);

        courseReact = new Course();
        setId(courseReact, 3L);
        courseReact.setTitle("React Frontend");
        courseReact.setStatus(CourseStatus.PUBLISHED);
        courseReact.setLevel(Level.BEGINNER);

        // Morning batch for Java: 09:00 AM - 11:00 AM
        batchJava = new Batch();
        setId(batchJava, 501L);
        batchJava.setName("Java Morning Batch");
        batchJava.setCourse(courseJava);
        batchJava.setMode(BatchMode.ONLINE);
        batchJava.setTiming("09:00 AM - 11:00 AM");
        batchJava.setStartDate(LocalDate.of(2026, 9, 1));
        batchJava.setEndDate(LocalDate.of(2026, 12, 31));
        batchJava.setActive(true);
        batchJava.setMaxStudents(30);

        // Afternoon batch for Python: 02:00 PM - 04:00 PM (non-overlapping)
        batchPython = new Batch();
        setId(batchPython, 502L);
        batchPython.setName("Python Afternoon Batch");
        batchPython.setCourse(coursePython);
        batchPython.setMode(BatchMode.ONLINE);
        batchPython.setTiming("02:00 PM - 04:00 PM");
        batchPython.setStartDate(LocalDate.of(2026, 9, 1));
        batchPython.setEndDate(LocalDate.of(2026, 12, 31));
        batchPython.setActive(true);
        batchPython.setMaxStudents(25);

        // React batch not enrolled for this student
        batchReact = new Batch();
        setId(batchReact, 503L);
        batchReact.setName("React Unenrolled Batch");
        batchReact.setCourse(courseReact);
        batchReact.setMode(BatchMode.ONLINE);
        batchReact.setTiming("05:00 PM - 07:00 PM");
        batchReact.setStartDate(LocalDate.of(2026, 9, 1));
        batchReact.setEndDate(LocalDate.of(2026, 12, 31));
        batchReact.setActive(true);
        batchReact.setMaxStudents(20);

        enrollmentJava = new Enrollment();
        setId(enrollmentJava, 1001L);
        enrollmentJava.setStudent(student);
        enrollmentJava.setCourse(courseJava);
        enrollmentJava.setBatch(batchJava);
        enrollmentJava.setActive(true);

        enrollmentPython = new Enrollment();
        setId(enrollmentPython, 1002L);
        enrollmentPython.setStudent(student);
        enrollmentPython.setCourse(coursePython);
        enrollmentPython.setBatch(batchPython);
        enrollmentPython.setActive(true);
    }

    @Test
    @DisplayName("Single student can hold multiple concurrent active enrollments across different courses and batches")
    void multiBatchConcurrentEnrollment_dataModelIntegrity() {
        // Architecture verification: Enrollment is the single source of truth
        assertEquals(student, enrollmentJava.getStudent());
        assertEquals(batchJava, enrollmentJava.getBatch());
        assertEquals(courseJava, enrollmentJava.getCourse());
        assertTrue(enrollmentJava.isActive());

        assertEquals(student, enrollmentPython.getStudent());
        assertEquals(batchPython, enrollmentPython.getBatch());
        assertEquals(coursePython, enrollmentPython.getCourse());
        assertTrue(enrollmentPython.isActive());

        // Distinct courses and batches
        assertNotEquals(enrollmentJava.getCourse().getId(), enrollmentPython.getCourse().getId());
        assertNotEquals(enrollmentJava.getBatch().getId(), enrollmentPython.getBatch().getId());
    }

    @Test
    @DisplayName("StudentResponse aggregates all active enrollments into batches and courses lists")
    void studentResponse_fromMultipleEnrollments() {
        List<Enrollment> activeEnrollments = List.of(enrollmentJava, enrollmentPython);
        StudentResponse response = StudentResponse.from(student, activeEnrollments);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals("MultiBatch Student", response.name());
        assertEquals(2, response.batches().size());
        assertEquals(2, response.courses().size());

        assertTrue(response.batches().stream().anyMatch(b -> b.id().equals(501L) && b.name().equals("Java Morning Batch")));
        assertTrue(response.batches().stream().anyMatch(b -> b.id().equals(502L) && b.name().equals("Python Afternoon Batch")));

        assertTrue(response.courses().stream().anyMatch(c -> c.id().equals(1L) && c.title().equals("Java Full Stack")));
        assertTrue(response.courses().stream().anyMatch(c -> c.id().equals(2L) && c.title().equals("Python Data Science")));
    }

    @Test
    @DisplayName("Deactivating Java enrollment leaves Python enrollment active and intact")
    void deactivatingOneEnrollment_leavesOtherIntact() {
        enrollmentJava.setActive(false);

        List<Enrollment> remainingActive = List.of(enrollmentJava, enrollmentPython);
        StudentResponse response = StudentResponse.from(student, remainingActive);

        // Only active enrollments are reflected in batches
        assertEquals(1, response.batches().size());
        assertEquals(502L, response.batches().get(0).id());
        assertEquals("Python Afternoon Batch", response.batches().get(0).name());
    }

    @Test
    @DisplayName("Non-overlapping multi-batch schedules pass validation")
    void nonOverlappingBatches_passScheduleValidation() {
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(100L))
                .thenReturn(List.of(enrollmentJava));

        // Adding batchPython (02:00 PM - 04:00 PM) when already in batchJava (09:00 AM - 11:00 AM)
        assertDoesNotThrow(() -> scheduleConflictValidator.validate(student, batchPython, null));
    }

    @Test
    @DisplayName("Overlapping batch schedule with existing enrollment fails validation")
    void overlappingBatch_failsScheduleValidation() {
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(100L))
                .thenReturn(List.of(enrollmentJava));

        // Conflicting batch overlapping Java morning timing: 10:00 AM - 12:00 PM
        Batch conflicting = new Batch();
        setId(conflicting, 503L);
        conflicting.setName("React Midday Batch");
        conflicting.setCourse(coursePython);
        conflicting.setMode(BatchMode.ONLINE);
        conflicting.setTiming("10:00 AM - 12:00 PM");
        conflicting.setStartDate(LocalDate.of(2026, 9, 1));
        conflicting.setEndDate(LocalDate.of(2026, 12, 31));
        conflicting.setActive(true);

        assertThrows(Exception.class, () -> scheduleConflictValidator.validate(student, conflicting, null));
    }

    // ─────────────────────────────────────────────────────────────
    // DIRECT API SECURITY & MULTI-BATCH AUTHORIZATION TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("API Security: Student can directly access enrolled Batch A and Batch B")
    void apiSecurity_studentCanAccessEnrolledBatches() {
        when(studentRepository.findByUserId(studentPrincipal.id())).thenReturn(Optional.of(student));
        when(batchRepository.findById(501L)).thenReturn(Optional.of(batchJava));
        when(batchRepository.findById(502L)).thenReturn(Optional.of(batchPython));

        when(enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(100L, 501L)).thenReturn(true);
        when(enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(100L, 502L)).thenReturn(true);

        BatchResponse respA = batchService.get(501L, studentPrincipal);
        assertNotNull(respA);
        assertEquals(501L, respA.id());

        BatchResponse respB = batchService.get(502L, studentPrincipal);
        assertNotNull(respB);
        assertEquals(502L, respB.id());
    }

    @Test
    @DisplayName("API Security: Student direct access to unenrolled Batch C is strictly forbidden (403)")
    void apiSecurity_studentCannotAccessUnenrolledBatch() {
        when(studentRepository.findByUserId(studentPrincipal.id())).thenReturn(Optional.of(student));
        when(batchRepository.findById(503L)).thenReturn(Optional.of(batchReact));
        when(enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(100L, 503L)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> batchService.get(503L, studentPrincipal));
    }

    @Test
    @DisplayName("API Security: Student direct content access to unenrolled Course C is strictly forbidden (403)")
    void apiSecurity_studentCannotAccessUnenrolledCourse() {
        when(studentRepository.findByUserId(studentPrincipal.id())).thenReturn(Optional.of(student));
        when(courseRepository.findById(3L)).thenReturn(Optional.of(courseReact));
        when(enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(100L, 3L)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> accessGuard.requireContentAccess(studentPrincipal, 3L));
    }

    @Test
    @DisplayName("API Security: Removing student from Batch A immediately terminates authorization for Batch A, while Batch B remains authorized")
    void apiSecurity_removalFromBatchA_terminatesAccessA_retainsB() {
        when(studentRepository.findByUserId(studentPrincipal.id())).thenReturn(Optional.of(student));
        when(batchRepository.findById(501L)).thenReturn(Optional.of(batchJava));
        when(batchRepository.findById(502L)).thenReturn(Optional.of(batchPython));

        // State before removal: both authorized
        when(enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(100L, 501L)).thenReturn(true);
        when(enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(100L, 502L)).thenReturn(true);

        assertNotNull(batchService.get(501L, studentPrincipal));
        assertNotNull(batchService.get(502L, studentPrincipal));

        // Action: student removed from Batch A (soft-deactivated: active = false)
        when(enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(100L, 501L)).thenReturn(false);

        // State after removal: Batch A access throws 403, Batch B remains accessible
        assertThrows(ForbiddenException.class, () -> batchService.get(501L, studentPrincipal));
        assertNotNull(batchService.get(502L, studentPrincipal));
    }
}
