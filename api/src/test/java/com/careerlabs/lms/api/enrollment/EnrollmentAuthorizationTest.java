package com.careerlabs.lms.api.enrollment;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentResponse;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentsPageResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentContactResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.enrollment.service.impl.EnrollmentContactServiceImpl;
import com.careerlabs.lms.api.enrollment.service.impl.EnrollmentServiceImpl;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
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
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnrollmentAuthorizationTest {

    @Mock EnrollmentRepository enrollmentRepository;
    @Mock StudentRepository studentRepository;
    @Mock CourseRepository courseRepository;
    @Mock BatchRepository batchRepository;
    @Mock UserRepository userRepository;

    BatchScheduleConflictValidator validator;
    CourseAccessGuard accessGuard;
    EnrollmentServiceImpl enrollmentService;
    EnrollmentContactServiceImpl contactService;

    Course publishedCourse, draftCourse;
    Student student;
    User studentUser;

    void setId(Object o, Long id) { ReflectionTestUtils.setField(o, "id", id); }

    Course makeCourse(Long id, String title, CourseStatus status) {
        Course c = new Course();
        setId(c, id);
        c.setTitle(title);
        c.setStatus(status);
        c.setDescription("desc");
        c.setDuration("6 months");
        return c;
    }

    @BeforeEach
    void setUp() {
        validator = new BatchScheduleConflictValidator(enrollmentRepository);
        accessGuard = new CourseAccessGuard(studentRepository, enrollmentRepository, batchRepository, courseRepository);
        enrollmentService = new EnrollmentServiceImpl(enrollmentRepository, studentRepository, courseRepository, batchRepository, validator, accessGuard, null);
        contactService = new EnrollmentContactServiceImpl(userRepository);

        publishedCourse = makeCourse(1L, "Java Bootcamp", CourseStatus.PUBLISHED);
        draftCourse = makeCourse(2L, "Draft Course", CourseStatus.DRAFT);

        studentUser = new User();
        setId(studentUser, 500L);
        studentUser.setName("Test Student");
        studentUser.setEmail("test@student.com");
        studentUser.setActive(true);

        student = new Student();
        setId(student, 10L);
        student.setUser(studentUser);
        student.setEnrollmentNo("CL-2026-0001");
    }

    // ---- Self-enrollment authorization (service-level guard) ----

    @Test
    @DisplayName("STUDENT self-enroll -> ForbiddenException (403)")
    void studentCannotSelfEnroll() {
        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> enrollmentService.enroll(1L, 10L, Role.STUDENT));
        assertTrue(ex.getMessage().toLowerCase().contains("contact"));
        verifyNoInteractions(studentRepository, courseRepository, enrollmentRepository);
    }

    @Test
    @DisplayName("TRAINER self-enroll -> ForbiddenException (403)")
    void trainerCannotSelfEnroll() {
        assertThrows(ForbiddenException.class, () -> enrollmentService.enroll(1L, 10L, Role.TRAINER));
        verifyNoInteractions(studentRepository, courseRepository, enrollmentRepository);
    }

    @Test
    @DisplayName("ADMIN can enroll (self-enroll path succeeds for PUBLISHED course)")
    void adminCanEnroll() {
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(publishedCourse));
        when(enrollmentRepository.findByStudentIdAndCourseId(10L, 1L)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        EnrollmentResponse response = enrollmentService.enroll(1L, 10L, Role.ADMIN);

        assertNotNull(response);
        assertEquals(1L, response.course().id());
    }

    @Test
    @DisplayName("SUPERADMIN can enroll (self-enroll path succeeds for PUBLISHED course)")
    void superAdminCanEnroll() {
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(publishedCourse));
        when(enrollmentRepository.findByStudentIdAndCourseId(10L, 1L)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> enrollmentService.enroll(1L, 10L, Role.SUPERADMIN));
    }

    @Test
    @DisplayName("ADMIN enrolling into a DRAFT course -> BadRequestException (lifecycle preserved)")
    void adminCannotEnrollInDraftCourse() {
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(2L)).thenReturn(Optional.of(draftCourse));

        assertThrows(BadRequestException.class, () -> enrollmentService.enroll(2L, 10L, Role.ADMIN));
    }

    // ---- Course roster (getCourseEnrollments) authorization ----

    private Batch makeBatch(Long id, String name, Course course, Long trainerId) {
        Batch b = new Batch();
        setId(b, id);
        b.setName(name);
        b.setCourse(course);
        if (trainerId != null) {
            User trainer = new User();
            setId(trainer, trainerId);
            b.setTrainers(Set.of(trainer));
        }
        b.setActive(true);
        b.setMaxStudents(30);
        return b;
    }

    private Enrollment makeEnrollment(Long id, Student student, Course course, Batch batch, boolean active) {
        Enrollment e = new Enrollment();
        setId(e, id);
        e.setStudent(student);
        e.setCourse(course);
        e.setBatch(batch);
        e.setActive(active);
        e.setEnrolledAt(Instant.now());
        return e;
    }

    @Test
    @DisplayName("Unassigned trainer cannot view course roster -> 403")
    void unassignedTrainer_cannotViewCourseRoster() {
        JwtUserPrincipal trainerPrincipal = new JwtUserPrincipal(99L, "trainer@test.com", "TRAINER");

        when(courseRepository.existsById(1L)).thenReturn(true);
        when(batchRepository.existsByTrainerIdAndCourseId(99L, 1L)).thenReturn(false);

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> enrollmentService.getCourseEnrollments(1L, null, null, null, 1, 20, trainerPrincipal));
        assertTrue(ex.getMessage().contains("not assigned"));
    }

    @Test
    @DisplayName("Trainer accessing another trainer's batch -> 403")
    void trainer_accessingOtherTrainerBatch_forbidden() {
        JwtUserPrincipal trainerA = new JwtUserPrincipal(10L, "trainerA@test.com", "TRAINER");
        Batch batchB = makeBatch(200L, "Batch B", publishedCourse, 20L);

        when(courseRepository.existsById(1L)).thenReturn(true);
        when(batchRepository.existsByTrainerIdAndCourseId(10L, 1L)).thenReturn(true);
        when(batchRepository.findByTrainerIdAndCourseId(10L, 1L)).thenReturn(List.of());

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> enrollmentService.getCourseEnrollments(1L, null, 200L, null, 1, 20, trainerA));
        assertTrue(ex.getMessage().contains("not assigned"));
    }

    @Test
    @DisplayName("Trainer with no batchId provided -> scoped to trainer's batches only")
    void trainer_noBatchProvided_scopesToTrainerBatches() {
        JwtUserPrincipal trainerA = new JwtUserPrincipal(10L, "trainerA@test.com", "TRAINER");
        Batch batchA = makeBatch(100L, "Batch A", publishedCourse, 10L);
        Enrollment enrollment = makeEnrollment(1L, student, publishedCourse, batchA, true);

        when(courseRepository.existsById(1L)).thenReturn(true);
        when(batchRepository.existsByTrainerIdAndCourseId(10L, 1L)).thenReturn(true);
        when(batchRepository.findByTrainerIdAndCourseId(10L, 1L)).thenReturn(List.of(batchA));
        when(enrollmentRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(enrollment)));

        CourseEnrolledStudentsPageResponse response =
                enrollmentService.getCourseEnrollments(1L, null, null, null, 1, 20, trainerA);

        assertNotNull(response);
        assertEquals(1, response.enrollments().size());
    }

    @Test
    @DisplayName("Admin retains full access with or without batch filter")
    void admin_retainsFullAccess_withOrWithoutBatch() {
        JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ADMIN");
        Batch batchA = makeBatch(100L, "Batch A", publishedCourse, 10L);
        Batch batchB = makeBatch(200L, "Batch B", publishedCourse, 20L);
        Enrollment e1 = makeEnrollment(1L, student, publishedCourse, batchA, true);

        when(courseRepository.existsById(1L)).thenReturn(true);
        when(enrollmentRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(e1)));

        CourseEnrolledStudentsPageResponse response =
                enrollmentService.getCourseEnrollments(1L, null, null, null, 1, 20, adminPrincipal);
        assertNotNull(response);

        when(enrollmentRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(e1)));
        CourseEnrolledStudentsPageResponse responseWithBatch =
                enrollmentService.getCourseEnrollments(1L, null, 100L, null, 1, 20, adminPrincipal);
        assertNotNull(responseWithBatch);
    }

    @Test
    @DisplayName("SuperAdmin retains full access across all batches")
    void superAdmin_retainsFullAccess() {
        JwtUserPrincipal superAdminPrincipal = new JwtUserPrincipal(1L, "superadmin@test.com", "SUPERADMIN");
        Batch batchA = makeBatch(100L, "Batch A", publishedCourse, 10L);
        Enrollment e1 = makeEnrollment(1L, student, publishedCourse, batchA, true);

        when(courseRepository.existsById(1L)).thenReturn(true);
        when(enrollmentRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(e1)));

        CourseEnrolledStudentsPageResponse response =
                enrollmentService.getCourseEnrollments(1L, null, null, null, 1, 20, superAdminPrincipal);
        assertNotNull(response);
        assertEquals(1, response.enrollments().size());
    }

    @Test
    @DisplayName("Student cannot view course roster -> 403")
    void student_cannotViewCourseRoster() {
        JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(50L, "student@test.com", "STUDENT");

        when(courseRepository.existsById(1L)).thenReturn(true);

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> enrollmentService.getCourseEnrollments(1L, null, null, null, 1, 20, studentPrincipal));
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    // ---- Enrollment contact info (no hardcoded values) ----

    private User staff(Long id, String name, String designation, Role role) {
        User u = new User();
        setId(u, id);
        u.setName(name);
        u.setEmail(name.toLowerCase().replace(" ", ".") + "@careerlabs.com");
        u.setPhone("+91" + id);
        u.setDesignation(designation);
        u.setRole(role);
        u.setActive(true);
        return u;
    }

    @Test
    @DisplayName("Contact prefers a Training Coordinator over regular staff")
    void contactPrefersCoordinator() {
        User admin = staff(1L, "Alice Admin", "Administrator", Role.ADMIN);
        User coordinator = staff(2L, "Carol Coordinator", "Training Coordinator", Role.TRAINER);
        when(userRepository.findByActiveTrueAndRoleInOrderByCreatedAtAsc(anyCollection()))
                .thenReturn(List.of(admin, coordinator));

        EnrollmentContactResponse contact = contactService.getContactInfo();

        assertEquals("Carol Coordinator", contact.name());
        assertEquals("Training Coordinator", contact.designation());
        assertNotNull(contact.email());
        assertNotNull(contact.phone());
    }

    @Test
    @DisplayName("Contact falls back to the earliest active admin when no coordinator exists")
    void contactFallsBackToAdmin() {
        User admin = staff(1L, "Alice Admin", "Administrator", Role.ADMIN);
        User trainer = staff(2L, "Tim Trainer", "Senior Trainer", Role.TRAINER);
        when(userRepository.findByActiveTrueAndRoleInOrderByCreatedAtAsc(anyCollection()))
                .thenReturn(List.of(admin, trainer));

        EnrollmentContactResponse contact = contactService.getContactInfo();

        assertEquals("Alice Admin", contact.name());
        assertEquals(Role.ADMIN, admin.getRole());
    }

    @Test
    @DisplayName("Contact is all-null when no staff exist in the system")
    void contactEmptyWhenNoStaff() {
        when(userRepository.findByActiveTrueAndRoleInOrderByCreatedAtAsc(anyCollection()))
                .thenReturn(List.of());

        EnrollmentContactResponse contact = contactService.getContactInfo();

        assertNull(contact.name());
        assertNull(contact.email());
        assertNull(contact.phone());
    }
}