package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseCatalogVisibilityTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CourseCodeGenerator courseCodeGenerator;
    @Mock private CourseAccessGuard accessGuard;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private SyllabusModuleRepository moduleRepository;
    @Mock private SyllabusService syllabusService;
    @Mock private MaterialRepository materialRepository;
    @Mock private BatchRepository batchRepository;

    private CourseServiceImpl courseService;

    private final JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(10L, "student@test.com", "STUDENT");
    private final JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ADMIN");
    private final JwtUserPrincipal trainerPrincipal = new JwtUserPrincipal(2L, "trainer@test.com", "TRAINER");

    void setId(Object o, Long id) { ReflectionTestUtils.setField(o, "id", id); }

    Course course(Long id, String title, CourseStatus status) {
        Course c = new Course();
        setId(c, id);
        c.setTitle(title);
        c.setStatus(status);
        c.setDescription("desc " + id);
        c.setDuration("6 months");
        c.setLevel(Level.BEGINNER);
        return c;
    }

    Student plainStudent(Long studentId) {
        Student s = new Student();
        setId(s, studentId);
        return s;
    }

    Enrollment activeEnrollment(Long studentId, Course c) {
        Enrollment e = new Enrollment();
        e.setStudent(plainStudent(studentId));
        e.setCourse(c);
        e.setActive(true);
        return e;
    }

    @BeforeEach
    void setUp() {
        courseService = new CourseServiceImpl(courseRepository, courseCodeGenerator, accessGuard, studentRepository,
                enrollmentRepository, moduleRepository, syllabusService, materialRepository, batchRepository);
    }

    @Test
    @DisplayName("Student sees ALL PUBLISHED courses with enrolled=true only for the batch-assigned course; DRAFT/ARCHIVED excluded")
    void studentSeesAllPublishedCoursesWithEnrolledFlag() {
        List<Course> published = new java.util.ArrayList<>();
        for (long i = 1; i <= 49; i++) {
            published.add(course(i, "Published " + i, CourseStatus.PUBLISHED));
        }
        Course draft = course(100L, "Draft", CourseStatus.DRAFT);
        Course archived = course(101L, "Archived", CourseStatus.ARCHIVED);

        when(accessGuard.isStudent(studentPrincipal)).thenReturn(true);
        when(accessGuard.isAdmin(studentPrincipal)).thenReturn(false);
        when(accessGuard.isTrainer(studentPrincipal)).thenReturn(false);
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(plainStudent(10L)));
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(10L))
                .thenReturn(List.of(activeEnrollment(10L, published.get(0))));
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED)).thenReturn(published);

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertEquals(49, result.size());
        assertTrue(result.stream().anyMatch(c -> c.id().equals(1L) && c.enrolled()));
        assertTrue(result.stream().noneMatch(c -> c.title().equals("Draft")));
        assertTrue(result.stream().noneMatch(c -> c.title().equals("Archived")));
        assertEquals(1, result.stream().filter(CourseResponse::enrolled).count());
        verify(courseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Student with an active enrollment in a PUBLISHED course gets enrolled=true for it")
    void studentActiveEnrollmentMarksCourseAsEnrolled() {
        Course c5 = course(5L, "Java Bootcamp", CourseStatus.PUBLISHED);
        Course c7 = course(7L, "AWS Essentials", CourseStatus.PUBLISHED);

        when(accessGuard.isStudent(studentPrincipal)).thenReturn(true);
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(plainStudent(10L)));
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(10L))
                .thenReturn(List.of(activeEnrollment(10L, c5)));
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED)).thenReturn(List.of(c5, c7));

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(c -> c.id().equals(5L) && c.enrolled()));
        assertTrue(result.stream().anyMatch(c -> c.id().equals(7L) && !c.enrolled()));
    }

    @Test
    @DisplayName("Student with no student record still sees all PUBLISHED courses, none marked enrolled")
    void studentWithoutRecordSeesAllPublishedNotEnrolled() {
        Course c1 = course(1L, "Course A", CourseStatus.PUBLISHED);

        when(accessGuard.isStudent(studentPrincipal)).thenReturn(true);
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.empty());
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED)).thenReturn(List.of(c1));

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertEquals(1, result.size());
        assertFalse(result.get(0).enrolled());
    }

    @Test
    @DisplayName("Inactive enrollments and draft/archived courses never appear as accessible")
    void inactiveEnrollmentNotMarkedAndNonPublishedExcluded() {
        Course draft = course(100L, "Draft", CourseStatus.DRAFT);
        Course archived = course(101L, "Archived", CourseStatus.ARCHIVED);

        when(accessGuard.isStudent(studentPrincipal)).thenReturn(true);
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(plainStudent(10L)));
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(10L)).thenReturn(List.of());
        when(courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED)).thenReturn(List.of());

        List<CourseResponse> result = courseService.list(studentPrincipal);

        assertTrue(result.isEmpty());
        verify(courseRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("Admin still sees ALL courses including DRAFT and ARCHIVED")
    void adminSeesAllCoursesIncludingDraftAndArchived() {
        Course published = course(1L, "Published", CourseStatus.PUBLISHED);
        Course draft = course(2L, "Draft", CourseStatus.DRAFT);
        Course archived = course(3L, "Archived", CourseStatus.ARCHIVED);

        when(accessGuard.isAdmin(adminPrincipal)).thenReturn(true);
        when(courseRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(published, draft, archived));

        List<CourseResponse> result = courseService.list(adminPrincipal);

        assertEquals(3, result.size());
        assertEquals(3, result.stream().map(CourseResponse::status).distinct().count());
    }

    @Test
    @DisplayName("Trainer still sees only courses from their assigned batches")
    void trainerSeesOnlyAssignedCourses() {
        Course c1 = course(1L, "A", CourseStatus.PUBLISHED);
        Course c2 = course(2L, "B", CourseStatus.ARCHIVED);

        when(accessGuard.isTrainer(trainerPrincipal)).thenReturn(true);
        when(courseRepository.findCoursesByTrainerId(2L)).thenReturn(List.of(c1, c2));

        List<CourseResponse> result = courseService.list(trainerPrincipal);

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(CourseResponse::enrolled));
    }
}