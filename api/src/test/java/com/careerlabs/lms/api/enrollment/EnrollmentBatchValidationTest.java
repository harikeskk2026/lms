package com.careerlabs.lms.api.enrollment;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.dto.request.BulkEnrollStudentsRequest;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentResponse;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.enrollment.service.impl.EnrollmentServiceImpl;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Verifies that admin enrollment (single and bulk) mandates a valid batch that
 * belongs to the course and has spare capacity - even when frontend validation
 * is bypassed through direct service/API calls.
 */
@ExtendWith(MockitoExtension.class)
class EnrollmentBatchValidationTest {

    @Mock EnrollmentRepository enrollmentRepository;
    @Mock StudentRepository studentRepository;
    @Mock CourseRepository courseRepository;
    @Mock BatchRepository batchRepository;

    EnrollmentServiceImpl enrollmentService;

    Course course;
    Student student;

    void setId(Object o, Long id) {
        ReflectionTestUtils.setField(o, "id", id);
    }

    @BeforeEach
    void setUp() {
        BatchScheduleConflictValidator validator = new BatchScheduleConflictValidator(enrollmentRepository);
        CourseAccessGuard accessGuard = new CourseAccessGuard(studentRepository, enrollmentRepository, batchRepository, courseRepository);
        enrollmentService = new EnrollmentServiceImpl(enrollmentRepository, studentRepository, courseRepository,
                batchRepository, validator, accessGuard, null);

        course = new Course();
        setId(course, 1L);
        course.setTitle("Java Bootcamp");
        course.setDescription("Course description");
        course.setDuration("6 months");
        course.setStatus(CourseStatus.PUBLISHED);

        User user = new User();
        setId(user, 500L);
        user.setName("Test Student");
        user.setEmail("test@student.com");
        user.setActive(true);

        student = new Student();
        setId(student, 10L);
        student.setUser(user);
        student.setEnrollmentNo("CL-2026-0001");
    }

    private Batch makeBatch(Long id, String name, Course batchCourse, int maxStudents, boolean active) {
        Batch b = new Batch();
        setId(b, id);
        b.setName(name);
        b.setCourse(batchCourse);
        b.setMaxStudents(maxStudents);
        b.setActive(active);
        return b;
    }

    @Test
    @DisplayName("Enroll with null batchId -> BadRequestException, no repository access")
    void nullBatch_rejected() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> enrollmentService.enrollStudentByAdmin(1L, new EnrollStudentRequest(10L, null)));
        assertTrue(ex.getMessage().contains("Batch is required"));
        verifyNoInteractions(courseRepository, studentRepository, batchRepository, enrollmentRepository);
    }

    @Test
    @DisplayName("Bulk enroll with null batchId -> BadRequestException")
    void bulkEnroll_nullBatch_rejected() {
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> enrollmentService.bulkEnrollStudentsByAdmin(1L,
                        new BulkEnrollStudentsRequest(List.of(10L, 11L), null)));
        assertTrue(ex.getMessage().contains("Batch is required"));
        verifyNoInteractions(courseRepository, studentRepository, batchRepository, enrollmentRepository);
    }

    @Test
    @DisplayName("Enroll with a batch belonging to another course -> BadRequestException")
    void wrongCourseBatch_rejected() {
        Course otherCourse = new Course();
        setId(otherCourse, 2L);
        otherCourse.setTitle("Other Course");
        otherCourse.setStatus(CourseStatus.PUBLISHED);
        Batch wrongBatch = makeBatch(100L, "Wrong Course Batch", otherCourse, 30, true);

        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(studentRepository.findById(10L)).thenReturn(Optional.of(student));
        when(batchRepository.findByIdWithLock(100L)).thenReturn(Optional.of(wrongBatch));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> enrollmentService.enrollStudentByAdmin(1L, new EnrollStudentRequest(10L, 100L)));
        assertTrue(ex.getMessage().contains("does not belong to course"));
    }

    @Test
    @DisplayName("Enroll into an inactive batch -> BadRequestException")
    void inactiveBatch_rejected() {
        Batch inactiveBatch = makeBatch(100L, "Inactive Batch", course, 30, false);

        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(studentRepository.findById(10L)).thenReturn(Optional.of(student));
        when(batchRepository.findByIdWithLock(100L)).thenReturn(Optional.of(inactiveBatch));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> enrollmentService.enrollStudentByAdmin(1L, new EnrollStudentRequest(10L, 100L)));
        assertTrue(ex.getMessage().contains("inactive"));
    }

    @Test
    @DisplayName("Enroll into a batch already at full capacity -> BadRequestException")
    void batchAtFullCapacity_rejected() {
        Batch fullBatch = makeBatch(100L, "Full Batch", course, 3, true);

        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(studentRepository.findById(10L)).thenReturn(Optional.of(student));
        when(batchRepository.findByIdWithLock(100L)).thenReturn(Optional.of(fullBatch));
        when(enrollmentRepository.countByBatchIdAndActiveTrue(100L)).thenReturn(3L);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> enrollmentService.enrollStudentByAdmin(1L, new EnrollStudentRequest(10L, 100L)));
        assertTrue(ex.getMessage().contains("full capacity"));
    }

    @Test
    @DisplayName("Enroll into a valid active batch with capacity available -> success")
    void validEnrollment_succeeds() {
        Batch activeBatch = makeBatch(100L, "Active Batch", course, 30, true);

        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(studentRepository.findById(10L)).thenReturn(Optional.of(student));
        when(batchRepository.findByIdWithLock(100L)).thenReturn(Optional.of(activeBatch));
        when(enrollmentRepository.countByBatchIdAndActiveTrue(100L)).thenReturn(2L);
        when(enrollmentRepository.findByStudentIdAndCourseId(10L, 1L)).thenReturn(Optional.empty());
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(10L)).thenReturn(List.of());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        CourseEnrolledStudentResponse response =
                enrollmentService.enrollStudentByAdmin(1L, new EnrollStudentRequest(10L, 100L));

        assertNotNull(response);
        assertEquals(10L, response.studentId());
        assertEquals(100L, response.batch().id());
    }
}