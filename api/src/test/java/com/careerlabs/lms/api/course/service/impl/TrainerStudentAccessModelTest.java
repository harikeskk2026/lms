package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.impl.BatchServiceImpl;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainerStudentAccessModelTest {

    @Mock private BatchRepository batchRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private DailyClassRepository dailyClassRepository;
    @Mock private CourseCodeGenerator courseCodeGenerator;
    @Mock private SyllabusModuleRepository moduleRepository;
    @Mock private SyllabusService syllabusService;
    @Mock private MaterialRepository materialRepository;

    private CourseAccessGuard accessGuard;
    private BatchServiceImpl batchService;
    private CourseServiceImpl courseService;

    // Principals
    private final JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ADMIN");
    private final JwtUserPrincipal trainerAPrincipal = new JwtUserPrincipal(10L, "trainerA@test.com", "TRAINER");
    private final JwtUserPrincipal trainerBPrincipal = new JwtUserPrincipal(20L, "trainerB@test.com", "TRAINER");
    private final JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(100L, "student@test.com", "STUDENT");

    // Entities
    private Course courseA;
    private Course courseB;
    private Batch batchA;
    private Batch batchB;
    private Student studentEntity;
    private User studentUser;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        accessGuard = new CourseAccessGuard(studentRepository, enrollmentRepository, batchRepository, courseRepository);
        batchService = new BatchServiceImpl(batchRepository, courseRepository, studentRepository, assignmentRepository, dailyClassRepository, userRepository, accessGuard);
        courseService = new CourseServiceImpl(
                courseRepository, courseCodeGenerator, accessGuard,
                studentRepository, enrollmentRepository,
                moduleRepository, syllabusService, materialRepository, batchRepository
        );

        // Course A
        courseA = new Course();
        setId(courseA, 101L);
        courseA.setTitle("Course A");
        courseA.setStatus(CourseStatus.PUBLISHED);

        // Course B
        courseB = new Course();
        setId(courseB, 102L);
        courseB.setTitle("Course B");
        courseB.setStatus(CourseStatus.PUBLISHED);

        // Batch A (assigned to Trainer A, belongs to Course A)
        batchA = new Batch();
        setId(batchA, 201L);
        batchA.setName("Batch A");
        batchA.setTrainerId(trainerAPrincipal.id());
        batchA.setCourse(courseA);
        batchA.setStartDate(LocalDate.now());
        batchA.setEndDate(LocalDate.now().plusMonths(3));

        // Batch B (assigned to Trainer B, belongs to Course B)
        batchB = new Batch();
        setId(batchB, 202L);
        batchB.setName("Batch B");
        batchB.setTrainerId(trainerBPrincipal.id());
        batchB.setCourse(courseB);
        batchB.setStartDate(LocalDate.now());
        batchB.setEndDate(LocalDate.now().plusMonths(3));

        // Student User & Entity
        studentUser = new User();
        setId(studentUser, studentPrincipal.id());
        studentUser.setRole(Role.STUDENT);

        studentEntity = new Student();
        setId(studentEntity, 501L);
        studentEntity.setUser(studentUser);
        studentEntity.setBatch(batchA);
        studentEntity.setCourse(courseA);
    }

    // ─────────────────────────────────────────────────────────────
    // 1. TRAINER BATCH ACCESS TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Trainer A list batches: returns ONLY batches assigned to Trainer A")
    void trainerListBatches_returnsAssignedOnly() {
        when(batchRepository.findPublishedByTrainerIdOrderByCreatedAtDesc(trainerAPrincipal.id()))
                .thenReturn(List.of(batchA));

        List<BatchResponse> result = batchService.list(trainerAPrincipal);

        assertEquals(1, result.size());
        assertEquals("Batch A", result.get(0).name());
        verify(batchRepository).findPublishedByTrainerIdOrderByCreatedAtDesc(trainerAPrincipal.id());
        verify(batchRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Trainer A direct batch access: allowed for assigned batch A")
    void trainerDirectBatchAccess_assigned_allowed() {
        when(batchRepository.findById(batchA.getId())).thenReturn(Optional.of(batchA));

        BatchResponse result = batchService.get(batchA.getId(), trainerAPrincipal);

        assertNotNull(result);
        assertEquals(batchA.getId(), result.id());
    }

    @Test
    @DisplayName("Trainer A direct batch access: throws 403 Forbidden for Trainer B's batch")
    void trainerDirectBatchAccess_unassigned_throwsForbidden() {
        when(batchRepository.findById(batchB.getId())).thenReturn(Optional.of(batchB));

        assertThrows(ForbiddenException.class, () -> batchService.get(batchB.getId(), trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer with no batches: list returns empty list")
    void trainerWithNoBatches_returnsEmpty() {
        JwtUserPrincipal newTrainer = new JwtUserPrincipal(99L, "new@test.com", "TRAINER");
        when(batchRepository.findPublishedByTrainerIdOrderByCreatedAtDesc(99L)).thenReturn(List.of());

        List<BatchResponse> result = batchService.list(newTrainer);

        assertTrue(result.isEmpty());
    }

    // ─────────────────────────────────────────────────────────────
    // 2. TRAINER COURSE ACCESS & CONTENT TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Trainer A list courses: returns ONLY courses belonging to assigned batches")
    void trainerListCourses_returnsAssignedBatchCoursesOnly() {
        when(courseRepository.findCoursesByTrainerId(trainerAPrincipal.id()))
                .thenReturn(List.of(courseA));

        List<CourseResponse> result = courseService.list(trainerAPrincipal);

        assertEquals(1, result.size());
        assertEquals("Course A", result.get(0).title());
        verify(courseRepository).findCoursesByTrainerId(trainerAPrincipal.id());
        verify(courseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Trainer A direct course access: allowed for Course A (assigned)")
    void trainerDirectCourseAccess_assigned_allowed() {
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(batchRepository.existsByTrainerIdAndCourseId(trainerAPrincipal.id(), courseA.getId()))
                .thenReturn(true);

        CourseResponse result = courseService.get(courseA.getId(), trainerAPrincipal);

        assertNotNull(result);
        assertEquals("Course A", result.title());
    }

    @Test
    @DisplayName("Trainer A direct course access: throws 403 Forbidden for Course B (unassigned)")
    void trainerDirectCourseAccess_unassigned_throwsForbidden() {
        when(courseRepository.findById(courseB.getId())).thenReturn(Optional.of(courseB));
        when(batchRepository.existsByTrainerIdAndCourseId(trainerAPrincipal.id(), courseB.getId()))
                .thenReturn(false);

        assertThrows(ForbiddenException.class, () -> courseService.get(courseB.getId(), trainerAPrincipal));
    }

    @Test
    @DisplayName("Trainer A course content access: allowed for Course A modules")
    void trainerContentAccess_assigned_allowed() {
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(batchRepository.existsByTrainerIdAndCourseId(trainerAPrincipal.id(), courseA.getId()))
                .thenReturn(true);

        assertDoesNotThrow(() -> accessGuard.requireContentAccess(trainerAPrincipal, courseA.getId()));
    }

    @Test
    @DisplayName("Trainer A course content access: throws 403 Forbidden for Course B modules")
    void trainerContentAccess_unassigned_throwsForbidden() {
        when(courseRepository.findById(courseB.getId())).thenReturn(Optional.of(courseB));
        when(batchRepository.existsByTrainerIdAndCourseId(trainerAPrincipal.id(), courseB.getId()))
                .thenReturn(false);

        assertThrows(ForbiddenException.class, () -> accessGuard.requireContentAccess(trainerAPrincipal, courseB.getId()));
    }

    // ─────────────────────────────────────────────────────────────
    // 3. STUDENT BATCH ACCESS TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Student list batches: returns ONLY the student's assigned batch")
    void studentListBatches_returnsEnrolledOnly() {
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        List<BatchResponse> result = batchService.list(studentPrincipal);

        assertEquals(1, result.size());
        assertEquals("Batch A", result.get(0).name());
        verify(batchRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Student direct batch access: allowed for assigned batch A")
    void studentDirectBatchAccess_assigned_allowed() {
        when(batchRepository.findById(batchA.getId())).thenReturn(Optional.of(batchA));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        BatchResponse result = batchService.get(batchA.getId(), studentPrincipal);

        assertNotNull(result);
        assertEquals(batchA.getId(), result.id());
    }

    @Test
    @DisplayName("Student direct batch access: throws 403 Forbidden for other batch B")
    void studentDirectBatchAccess_otherBatch_throwsForbidden() {
        when(batchRepository.findById(batchB.getId())).thenReturn(Optional.of(batchB));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        assertThrows(ForbiddenException.class, () -> batchService.get(batchB.getId(), studentPrincipal));
    }

    @Test
    @DisplayName("Student with no batch: list returns empty list")
    void studentWithNoBatch_returnsEmpty() {
        Student unassignedStudent = new Student();
        unassignedStudent.setBatch(null);
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(unassignedStudent));

        List<BatchResponse> result = batchService.list(studentPrincipal);

        assertTrue(result.isEmpty());
    }

    // ─────────────────────────────────────────────────────────────
    // 4. STUDENT COURSE ACCESS & CONTENT TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Student list courses: sees ALL PUBLISHED courses, enrolled flag marks the assigned batch course")
    void studentListCourses_seesAllPublishedWithBatchCourseEnrolled() {
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(studentEntity.getId()))
                .thenReturn(List.of());
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED))
                .thenReturn(List.of(courseA, courseB));

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertEquals(2, result.size());
        CourseResponse courseAResponse = result.stream().filter(c -> c.id().equals(courseA.getId())).findFirst().orElseThrow();
        CourseResponse courseBResponse = result.stream().filter(c -> c.id().equals(courseB.getId())).findFirst().orElseThrow();
        assertTrue(courseAResponse.enrolled());
        assertFalse(courseBResponse.enrolled());
        verify(courseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Student direct course access: allowed for Course A (assigned via batch)")
    void studentDirectCourseAccess_assigned_allowed() {
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        CourseResponse result = courseService.get(courseA.getId(), studentPrincipal);

        assertNotNull(result);
        assertEquals("Course A", result.title());
    }

    @Test
    @DisplayName("Student direct course access: throws 403 Forbidden for Course B (unrelated)")
    void studentDirectCourseAccess_unrelated_throwsForbidden() {
        when(courseRepository.findById(courseB.getId())).thenReturn(Optional.of(courseB));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        assertThrows(ForbiddenException.class, () -> courseService.get(courseB.getId(), studentPrincipal));
    }

    @Test
    @DisplayName("Student course content access: allowed for Course A modules")
    void studentContentAccess_assigned_allowed() {
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        assertDoesNotThrow(() -> accessGuard.requireContentAccess(studentPrincipal, courseA.getId()));
    }

    @Test
    @DisplayName("Student course content access: throws 403 Forbidden for Course B modules")
    void studentContentAccess_unassigned_throwsForbidden() {
        when(courseRepository.findById(courseB.getId())).thenReturn(Optional.of(courseB));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        assertThrows(ForbiddenException.class, () -> accessGuard.requireContentAccess(studentPrincipal, courseB.getId()));
    }

    @Test
    @DisplayName("Student course access: allowed for Course B when actively enrolled even if assigned batch belongs to Course A")
    void studentCourseAccess_enrolledWithoutBatchOrDifferentBatch_allowed() {
        setId(studentEntity, 1L);
        when(courseRepository.findById(courseB.getId())).thenReturn(Optional.of(courseB));
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));
        when(enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(studentEntity.getId(), courseB.getId()))
                .thenReturn(true);

        CourseResponse result = courseService.get(courseB.getId(), studentPrincipal);

        assertNotNull(result);
        assertEquals("Course B", result.title());
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(studentPrincipal, courseB.getId()));
    }

    // ─────────────────────────────────────────────────────────────
    // 5. BATCH REASSIGNMENT TEST
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Batch reassignment: student re-assigned from Batch A to Batch B gains access to Course B and loses Course A")
    void batchReassignment_courseAccessFollowsNewBatch() {
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(courseRepository.findById(courseB.getId())).thenReturn(Optional.of(courseB));
        // Initial state: assigned to Batch A
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        assertTrue(accessGuard.isStudentForCourse(studentPrincipal, courseA.getId()));
        assertFalse(accessGuard.isStudentForCourse(studentPrincipal, courseB.getId()));

        // Reassign to Batch B
        studentEntity.setBatch(batchB);
        studentEntity.setCourse(courseB);

        // Access now flips
        assertFalse(accessGuard.isStudentForCourse(studentPrincipal, courseA.getId()));
        assertTrue(accessGuard.isStudentForCourse(studentPrincipal, courseB.getId()));

        // Verifying requireVisible and requireContentAccess
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(studentPrincipal, courseB.getId()));
        assertThrows(ForbiddenException.class, () -> accessGuard.requireContentAccess(studentPrincipal, courseA.getId()));
    }

    // ─────────────────────────────────────────────────────────────
    // 6. ADMIN / SUPERADMIN MANAGEMENT ACCESS TEST
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Admin full access: can list all batches and all courses")
    void admin_hasFullAccess() {
        when(batchRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(batchA, batchB));
        when(courseRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(courseA, courseB));

        List<BatchResponse> batches = batchService.list(adminPrincipal);
        List<CourseResponse> courses = courseService.list(adminPrincipal);

        assertEquals(2, batches.size());
        assertEquals(2, courses.size());

        assertDoesNotThrow(() -> accessGuard.requireVisible(adminPrincipal, courseA));
        assertDoesNotThrow(() -> accessGuard.requireVisible(adminPrincipal, courseB));
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(adminPrincipal, courseA.getId()));
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(adminPrincipal, courseB.getId()));
    }

    // ─────────────────────────────────────────────────────────────
    // 7. STATUS VISIBILITY MATRIX (assignment does NOT override status)
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Visibility matrix: DRAFT hidden from assigned trainer; ARCHIVED remains accessible to assigned trainer")
    void visibilityMatrix_trainer_nonPublished_forbidden() {
        Course draft = new Course();
        setId(draft, 301L);
        draft.setTitle("Draft Course");
        draft.setStatus(CourseStatus.DRAFT);

        Course archived = new Course();
        setId(archived, 302L);
        archived.setTitle("Archived Course");
        archived.setStatus(CourseStatus.ARCHIVED);

        // DRAFT still assigned to trainer => content access denied
        when(courseRepository.findById(draft.getId())).thenReturn(Optional.of(draft));
        assertThrows(ForbiddenException.class, () -> accessGuard.requireVisible(trainerAPrincipal, draft));
        assertThrows(ForbiddenException.class, () -> accessGuard.requireContentAccess(trainerAPrincipal, draft.getId()));

        // ARCHIVED => still accessible to assigned trainer (existing access preserved)
        when(courseRepository.findById(archived.getId())).thenReturn(Optional.of(archived));
        when(batchRepository.existsByTrainerIdAndCourseId(trainerAPrincipal.id(), archived.getId()))
                .thenReturn(true);
        assertDoesNotThrow(() -> accessGuard.requireVisible(trainerAPrincipal, archived));
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(trainerAPrincipal, archived.getId()));

        // PUBLISHED still assigned => content access allowed
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        when(batchRepository.existsByTrainerIdAndCourseId(trainerAPrincipal.id(), courseA.getId())).thenReturn(true);
        assertDoesNotThrow(() -> accessGuard.requireVisible(trainerAPrincipal, courseA));
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(trainerAPrincipal, courseA.getId()));
    }

    @Test
    @DisplayName("Visibility matrix: DRAFT hidden from enrolled student; ARCHIVED remains accessible to student in batch")
    void visibilityMatrix_student_nonPublished_forbidden() {
        Course archived = new Course();
        setId(archived, 302L);
        archived.setTitle("Archived Course");
        archived.setStatus(CourseStatus.ARCHIVED);

        // Student assigned to a batch whose course is ARCHIVED => still accessible
        when(courseRepository.findById(archived.getId())).thenReturn(Optional.of(archived));
        when(studentRepository.findByUserId(studentPrincipal.id())).thenReturn(Optional.of(studentEntity));

        Batch archivedBatch = new Batch();
        setId(archivedBatch, 203L);
        archivedBatch.setName("Archived Batch");
        archivedBatch.setCourse(archived);
        studentEntity.setBatch(archivedBatch);

        assertDoesNotThrow(() -> accessGuard.requireContentAccess(studentPrincipal, archived.getId()));
        assertDoesNotThrow(() -> accessGuard.requireVisible(studentPrincipal, archived));

        // PUBLISHED course for the student => allowed
        studentEntity.setBatch(batchA);
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        assertDoesNotThrow(() -> accessGuard.requireContentAccess(studentPrincipal, courseA.getId()));
        assertDoesNotThrow(() -> accessGuard.requireVisible(studentPrincipal, courseA));
    }

    // ─────────────────────────────────────────────────────────────
    // 8. ARCHIVED VISIBILITY IN LISTS (trainer + student)
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Student list courses: ARCHIVED course is excluded from the general catalog")
    void studentListCourses_archivedCourse_notReturned() {
        courseA.setStatus(CourseStatus.ARCHIVED);
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(studentEntity.getId()))
                .thenReturn(List.of());
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED))
                .thenReturn(List.of());

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Student list courses: DRAFT course of assigned batch stays hidden")
    void studentListCourses_draftCourse_hidden() {
        courseA.setStatus(CourseStatus.DRAFT);
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Student list batches: ARCHIVED course batch is returned; DRAFT course batch is hidden")
    void studentListBatches_archivedAndDraft() {
        when(studentRepository.findByUserId(studentPrincipal.id()))
                .thenReturn(Optional.of(studentEntity));

        courseA.setStatus(CourseStatus.ARCHIVED);
        List<BatchResponse> archivedResult = batchService.list(studentPrincipal);
        assertEquals(1, archivedResult.size());
        assertEquals("Batch A", archivedResult.get(0).name());

        courseA.setStatus(CourseStatus.DRAFT);
        List<BatchResponse> draftResult = batchService.list(studentPrincipal);
        assertTrue(draftResult.isEmpty());
    }

    @Test
    @DisplayName("Trainer direct batch access: ARCHIVED course batch allowed; DRAFT course batch forbidden")
    void trainerBatchGet_archivedAllowed_draftForbidden() {
        when(batchRepository.findById(batchA.getId())).thenReturn(Optional.of(batchA));

        courseA.setStatus(CourseStatus.ARCHIVED);
        assertNotNull(batchService.get(batchA.getId(), trainerAPrincipal));

        courseA.setStatus(CourseStatus.DRAFT);
        assertThrows(ForbiddenException.class, () -> batchService.get(batchA.getId(), trainerAPrincipal));
    }

    @Test
    @DisplayName("Guard helpers: readable statuses are PUBLISHED and ARCHIVED only; only PUBLISHED accepts new participants")
    void guardStatusHelpers() {
        assertTrue(accessGuard.isReadableCourseStatus(CourseStatus.PUBLISHED));
        assertTrue(accessGuard.isReadableCourseStatus(CourseStatus.ARCHIVED));
        assertFalse(accessGuard.isReadableCourseStatus(CourseStatus.DRAFT));

        assertTrue(accessGuard.isAcceptingNewParticipant(CourseStatus.PUBLISHED));
        assertFalse(accessGuard.isAcceptingNewParticipant(CourseStatus.ARCHIVED));
        assertFalse(accessGuard.isAcceptingNewParticipant(CourseStatus.DRAFT));

        courseA.setStatus(CourseStatus.ARCHIVED);
        when(courseRepository.findById(courseA.getId())).thenReturn(Optional.of(courseA));
        assertTrue(accessGuard.isReadableCourse(courseA.getId()));
    }
}
