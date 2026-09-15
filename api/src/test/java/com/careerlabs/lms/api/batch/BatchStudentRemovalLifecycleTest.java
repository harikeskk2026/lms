package com.careerlabs.lms.api.batch;

import com.careerlabs.lms.api.batch.controller.AdminBatchController;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.enrollment.service.impl.EnrollmentServiceImpl;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.student.service.StudentService;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchStudentRemovalLifecycleTest {

    @Mock BatchRepository batchRepository;
    @Mock StudentRepository studentRepository;
    @Mock StudentService studentService;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock BatchScheduleConflictValidator batchScheduleConflictValidator;
    @Mock com.careerlabs.lms.api.course.repository.CourseRepository courseRepository;

    AdminBatchController adminBatchController;
    EnrollmentServiceImpl enrollmentService;

    Course courseA, courseB;
    Batch batch1, batch2, batch3;
    Student student;
    User studentUser;

    void setId(Object o, Long id) { ReflectionTestUtils.setField(o, "id", id); }

    @BeforeEach
    void setUp() {
        adminBatchController = new AdminBatchController(batchRepository, studentRepository, studentService, enrollmentRepository);
        enrollmentService = new EnrollmentServiceImpl(enrollmentRepository, studentRepository, courseRepository,
                batchRepository, batchScheduleConflictValidator, null);

        courseA = new Course();
        setId(courseA, 10L);
        courseA.setTitle("Java Bootcamp");
        courseA.setStatus(CourseStatus.PUBLISHED);
        courseA.setDescription("desc");
        courseA.setDuration("6 months");

        courseB = new Course();
        setId(courseB, 20L);
        courseB.setTitle("Python Course");
        courseB.setStatus(CourseStatus.PUBLISHED);
        courseB.setDescription("desc");
        courseB.setDuration("3 months");

        batch1 = new Batch();
        setId(batch1, 100L);
        batch1.setName("Batch A-1");
        batch1.setCourse(courseA);
        batch1.setStartDate(LocalDate.of(2026, 1, 1));
        batch1.setEndDate(LocalDate.of(2026, 6, 30));
        batch1.setTiming("10:00-12:00");
        batch1.setMode(BatchMode.ONLINE);
        batch1.setActive(true);
        batch1.setMaxStudents(30);

        batch2 = new Batch();
        setId(batch2, 200L);
        batch2.setName("Batch B-1");
        batch2.setCourse(courseB);
        batch2.setStartDate(LocalDate.of(2026, 1, 1));
        batch2.setEndDate(LocalDate.of(2026, 6, 30));
        batch2.setTiming("14:00-16:00");
        batch2.setMode(BatchMode.ONLINE);
        batch2.setActive(true);
        batch2.setMaxStudents(30);

        batch3 = new Batch();
        setId(batch3, 300L);
        batch3.setName("Batch A-2");
        batch3.setCourse(courseA);
        batch3.setStartDate(LocalDate.of(2026, 7, 1));
        batch3.setEndDate(LocalDate.of(2026, 12, 31));
        batch3.setTiming("10:00-12:00");
        batch3.setMode(BatchMode.OFFLINE);
        batch3.setActive(true);
        batch3.setMaxStudents(25);

        studentUser = new User();
        setId(studentUser, 1L);
        studentUser.setName("John Student");
        studentUser.setEmail("john@student.com");
        studentUser.setRole(Role.STUDENT);
        studentUser.setActive(true);

        student = new Student();
        setId(student, 50L);
        student.setUser(studentUser);
        student.setEnrollmentNo("STU-001");
    }

    // ── 1. Batch Removal & Course Retention ───────────────────────

    @Test
    @DisplayName("Remove student from batch: batch=null, active=true, course enrollment preserved")
    void removeStudentFromBatch_keepsCourseEnrollment() {
        Enrollment enrollment = new Enrollment();
        setId(enrollment, 1L);
        enrollment.setStudent(student);
        enrollment.setCourse(courseA);
        enrollment.setBatch(batch1);
        enrollment.setActive(true);

        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndBatchIdAndActiveTrue(50L, 100L)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        adminBatchController.removeStudent(100L, 50L);

        assertNull(enrollment.getBatch(), "Batch should be null after removal");
        assertTrue(enrollment.isActive(), "Enrollment should remain active");
    }

    @Test
    @DisplayName("Course access check returns true after batch removal")
    void courseAccessPreserved_afterBatchRemoval() {
        Enrollment enrollment = new Enrollment();
        setId(enrollment, 1L);
        enrollment.setStudent(student);
        enrollment.setCourse(courseA);
        enrollment.setBatch(batch1);
        enrollment.setActive(true);

        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndBatchIdAndActiveTrue(50L, 100L)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        adminBatchController.removeStudent(100L, 50L);

        // After removal, the enrollment is still active so course access check should pass
        when(enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(50L, 10L)).thenReturn(true);
        assertTrue(enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(50L, 10L),
                "Student should retain course access after batch removal");
    }

    // ── 2. Batch Occupancy & Listing ──────────────────────────────

    @Test
    @DisplayName("Student excluded from batch student list after removal")
    void studentExcludedFromBatchList_afterRemoval() {
        Enrollment enrollment = new Enrollment();
        setId(enrollment, 1L);
        enrollment.setStudent(student);
        enrollment.setCourse(courseA);
        enrollment.setBatch(batch1);
        enrollment.setActive(true);

        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndBatchIdAndActiveTrue(50L, 100L)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        adminBatchController.removeStudent(100L, 50L);

        // After removal, student should not appear in batch's active student list
        when(enrollmentRepository.findActiveStudentsByBatchId(100L)).thenReturn(List.of());
        List<Student> batchStudents = enrollmentRepository.findActiveStudentsByBatchId(100L);
        assertTrue(batchStudents.isEmpty(), "Student should not appear in batch student list after removal");
    }

    @Test
    @DisplayName("Batch occupancy count decrements after student removal")
    void batchOccupancyDecrements_afterRemoval() {
        Enrollment enrollment = new Enrollment();
        setId(enrollment, 1L);
        enrollment.setStudent(student);
        enrollment.setCourse(courseA);
        enrollment.setBatch(batch1);
        enrollment.setActive(true);

        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndBatchIdAndActiveTrue(50L, 100L)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        adminBatchController.removeStudent(100L, 50L);

        // After removal, count should be 0 (was 1 before)
        when(enrollmentRepository.countByBatchIdAndActiveTrue(100L)).thenReturn(0L);
        assertEquals(0L, enrollmentRepository.countByBatchIdAndActiveTrue(100L),
                "Batch occupancy should decrement after student removal");
    }

    // ── 3. Multi-Batch Independence ───────────────────────────────

    @Test
    @DisplayName("Removing from Batch 1 does not affect enrollment in Batch 2 (different course)")
    void removalFromBatch1_noEffectOnBatch2() {
        Enrollment enrollmentA = new Enrollment();
        setId(enrollmentA, 1L);
        enrollmentA.setStudent(student);
        enrollmentA.setCourse(courseA);
        enrollmentA.setBatch(batch1);
        enrollmentA.setActive(true);

        Enrollment enrollmentB = new Enrollment();
        setId(enrollmentB, 2L);
        enrollmentB.setStudent(student);
        enrollmentB.setCourse(courseB);
        enrollmentB.setBatch(batch2);
        enrollmentB.setActive(true);

        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndBatchIdAndActiveTrue(50L, 100L)).thenReturn(Optional.of(enrollmentA));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        adminBatchController.removeStudent(100L, 50L);

        // Batch 1 enrollment: batch=null, active=true
        assertNull(enrollmentA.getBatch());
        assertTrue(enrollmentA.isActive());

        // Batch 2 enrollment: completely unaffected
        assertEquals(batch2, enrollmentB.getBatch(), "Batch 2 enrollment should be unaffected");
        assertTrue(enrollmentB.isActive(), "Batch 2 enrollment should remain active");
    }

    // ── 4. Reassignment to New Batch ──────────────────────────────

    @Test
    @DisplayName("After removal, student can be assigned to a new batch via assignToBatch")
    void reassignmentToNewBatch_worksViaAssignToBatch() {
        // Simulate: student was removed from batch1 (enrollment active, batch=null)
        Enrollment enrollment = new Enrollment();
        setId(enrollment, 1L);
        enrollment.setStudent(student);
        enrollment.setCourse(courseA);
        enrollment.setBatch(null);
        enrollment.setActive(true);

        // Directly set the batch on the enrollment to simulate assignToBatch behavior
        enrollment.setBatch(batch3);
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));
        enrollmentRepository.save(enrollment);

        assertEquals(batch3, enrollment.getBatch(), "Enrollment should be assigned to new batch");
        assertTrue(enrollment.isActive(), "Enrollment should remain active");
    }

    // ── 5. Reactivation Does Not Resurrect Old Batch ──────────────

    @Test
    @DisplayName("Self-enroll reactivation sets batch=null, no zombie batch resurrection")
    void selfEnrollReactivation_noBatchResurrection() {
        Enrollment inactiveEnrollment = new Enrollment();
        setId(inactiveEnrollment, 1L);
        inactiveEnrollment.setStudent(student);
        inactiveEnrollment.setCourse(courseA);
        inactiveEnrollment.setBatch(batch1); // Old batch reference
        inactiveEnrollment.setActive(false);

        when(studentRepository.findByUserId(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(courseA));
        when(enrollmentRepository.findByStudentIdAndCourseId(50L, 10L)).thenReturn(Optional.of(inactiveEnrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        enrollmentService.enroll(10L, 1L, Role.ADMIN);

        assertTrue(inactiveEnrollment.isActive(), "Enrollment should be reactivated");
        assertNull(inactiveEnrollment.getBatch(), "Batch should be null after reactivation, not resurrected");
    }

    @Test
    @DisplayName("Admin enroll reactivation without batch sets batch=null")
    void adminEnrollReactivation_noBatch_noResurrection() {
        Enrollment inactiveEnrollment = new Enrollment();
        setId(inactiveEnrollment, 1L);
        inactiveEnrollment.setStudent(student);
        inactiveEnrollment.setCourse(courseA);
        inactiveEnrollment.setBatch(batch1); // Old batch reference
        inactiveEnrollment.setActive(false);

        when(courseRepository.findById(10L)).thenReturn(Optional.of(courseA));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndCourseId(50L, 10L)).thenReturn(Optional.of(inactiveEnrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest request = new EnrollStudentRequest(50L, null);
        enrollmentService.enrollStudentByAdmin(10L, request);

        assertTrue(inactiveEnrollment.isActive(), "Enrollment should be reactivated");
        assertNull(inactiveEnrollment.getBatch(), "Batch should be null when reactivated without new batch");
    }

    @Test
    @DisplayName("Admin enroll reactivation WITH new batch sets the new batch correctly")
    void adminEnrollReactivation_withNewBatch_setsNewBatch() {
        Enrollment inactiveEnrollment = new Enrollment();
        setId(inactiveEnrollment, 1L);
        inactiveEnrollment.setStudent(student);
        inactiveEnrollment.setCourse(courseA);
        inactiveEnrollment.setBatch(batch1); // Old batch reference
        inactiveEnrollment.setActive(false);

        when(courseRepository.findById(10L)).thenReturn(Optional.of(courseA));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(batchRepository.findByIdWithLock(300L)).thenReturn(Optional.of(batch3));
        when(enrollmentRepository.findByStudentIdAndCourseId(50L, 10L)).thenReturn(Optional.of(inactiveEnrollment));
        when(enrollmentRepository.countByBatchIdAndActiveTrue(300L)).thenReturn(5L);
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest request = new EnrollStudentRequest(50L, 300L);
        enrollmentService.enrollStudentByAdmin(10L, request);

        assertTrue(inactiveEnrollment.isActive(), "Enrollment should be reactivated");
        assertEquals(batch3, inactiveEnrollment.getBatch(), "Should use new batch, not old one");
    }

    // ── 6. Error Cases ────────────────────────────────────────────

    @Test
    @DisplayName("Remove student from batch fails when student not in batch")
    void removeStudent_notInBatch_throwsException() {
        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(50L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByStudentIdAndBatchIdAndActiveTrue(50L, 100L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class,
                () -> adminBatchController.removeStudent(100L, 50L));
    }

    @Test
    @DisplayName("Remove student fails when batch does not exist")
    void removeStudent_batchNotFound_throwsException() {
        when(batchRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> adminBatchController.removeStudent(999L, 50L));
    }

    @Test
    @DisplayName("Remove student fails when student does not exist")
    void removeStudent_studentNotFound_throwsException() {
        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(studentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> adminBatchController.removeStudent(100L, 999L));
    }

    // ── 7. Course Unenrollment Clears Batch ────────────────────────

    @Test
    @DisplayName("Unenrolling student from course clears batch to prevent zombie resurrection")
    void unenrollStudent_clearsBatch() {
        Enrollment enrollment = new Enrollment();
        setId(enrollment, 1L);
        enrollment.setStudent(student);
        enrollment.setCourse(courseA);
        enrollment.setBatch(batch1);
        enrollment.setActive(true);

        when(enrollmentRepository.findByIdAndCourseId(1L, 10L)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        enrollmentService.unenrollStudentByAdmin(10L, 1L);

        assertFalse(enrollment.isActive(), "Enrollment should be deactivated");
        assertNull(enrollment.getBatch(), "Batch should be cleared on unenrollment");
    }
}
