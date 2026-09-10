package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.service.AnnouncementPlaceholderResolver;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnouncementPlaceholderResolverTest {

    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private com.careerlabs.lms.api.course.repository.CourseRepository courseRepository;
    @Mock
    private com.careerlabs.lms.api.batch.repository.BatchRepository batchRepository;

    private AnnouncementPlaceholderResolver resolver;

    private Student student;
    private User user;

    @BeforeEach
    void setUp() {
        resolver = new AnnouncementPlaceholderResolver(attendanceRepository, enrollmentRepository, courseRepository, batchRepository);
        student = new Student();
        ReflectionTestUtils.setField(student, "id", 100L);
        user = new User();
        user.setName("John Doe");
        student.setUser(user);
    }

    @Test
    @DisplayName("Displays multiple enrolled course names separated by comma")
    void variablesFor_multipleEnrolledCourses() {
        when(enrollmentRepository.findActiveCourseTitlesByStudentId(100L))
                .thenReturn(List.of("Python Fundamentals", "Advanced Java"));

        Map<String, String> vars = resolver.variablesFor(student);

        assertEquals("Python Fundamentals, Advanced Java", vars.get("courseName"));

        String text = "Welcome to {{courseName}}!";
        String resolved = resolver.resolve(text, vars);
        assertEquals("Welcome to Python Fundamentals, Advanced Java!", resolved);
    }

    @Test
    @DisplayName("Displays single enrolled course name")
    void variablesFor_singleEnrolledCourse() {
        when(enrollmentRepository.findActiveCourseTitlesByStudentId(100L))
                .thenReturn(List.of("Data Structures & Algorithms"));

        Map<String, String> vars = resolver.variablesFor(student);

        assertEquals("Data Structures & Algorithms", vars.get("courseName"));
    }

    @Test
    @DisplayName("Includes student direct course if not present in enrollments")
    void variablesFor_directCourseFallback() {
        when(enrollmentRepository.findActiveCourseTitlesByStudentId(100L))
                .thenReturn(List.of());
        when(enrollmentRepository.findAllCourseTitlesByStudentId(100L))
                .thenReturn(List.of());

        Course course = new Course();
        course.setTitle("Web Development");
        student.setCourse(course);

        Map<String, String> vars = resolver.variablesFor(student);

        assertEquals("Web Development", vars.get("courseName"));
    }

    @Test
    @DisplayName("Deduplicates if course is present both in enrollment and direct course")
    void variablesFor_deduplicatesCourseNames() {
        when(enrollmentRepository.findActiveCourseTitlesByStudentId(100L))
                .thenReturn(List.of("Full Stack Java", "Spring Boot"));

        Course course = new Course();
        course.setTitle("Full Stack Java");
        student.setCourse(course);

        Map<String, String> vars = resolver.variablesFor(student);

        assertEquals("Full Stack Java, Spring Boot", vars.get("courseName"));
    }

    @Test
    @DisplayName("Includes batch course if student has batch with course")
    void variablesFor_includesBatchCourse() {
        when(enrollmentRepository.findActiveCourseTitlesByStudentId(100L))
                .thenReturn(List.of("Python Fundamentals"));

        Batch batch = new Batch();
        Course batchCourse = new Course();
        batchCourse.setTitle("DevOps Essentials");
        batch.setCourse(batchCourse);
        student.setBatch(batch);

        Map<String, String> vars = resolver.variablesFor(student);

        assertEquals("Python Fundamentals, DevOps Essentials", vars.get("courseName"));
    }

    @Test
    @DisplayName("Returns empty string when student has no course enrolled")
    void variablesFor_noCourse() {
        when(enrollmentRepository.findActiveCourseTitlesByStudentId(100L))
                .thenReturn(List.of());
        when(enrollmentRepository.findAllCourseTitlesByStudentId(100L))
                .thenReturn(List.of());

        Map<String, String> vars = resolver.variablesFor(student);

        assertEquals("", vars.get("courseName"));
    }

    @Test
    @DisplayName("sampleVariables returns all available course names when multiple courses exist")
    void sampleVariables_returnsAllCoursesWhenPresent() {
        Course c1 = new Course();
        c1.setTitle("Python");
        Course c2 = new Course();
        c2.setTitle("React");
        Course c3 = new Course();
        c3.setTitle("C Sharp");
        when(courseRepository.findAll()).thenReturn(List.of(c1, c2, c3));

        Map<String, String> sample = resolver.sampleVariables();

        assertEquals("Python, React, C Sharp", sample.get("courseName"));
        assertEquals("Jane Student", sample.get("studentName"));
        assertEquals("Demo Batch", sample.get("batchName"));
    }

    @Test
    @DisplayName("sampleVariables resolves specific course and batch when provided")
    void sampleVariables_contextualCourseAndBatch() {
        Course c = new Course();
        c.setTitle("Advanced C#");
        when(courseRepository.findById(14L)).thenReturn(java.util.Optional.of(c));

        Batch b = new Batch();
        b.setName("Weekend Batch");
        when(batchRepository.findById(4L)).thenReturn(java.util.Optional.of(b));

        Map<String, String> sample = resolver.sampleVariables(14L, 4L);

        assertEquals("Advanced C#", sample.get("courseName"));
        assertEquals("Weekend Batch", sample.get("batchName"));
    }

    @Test
    @DisplayName("sampleVariables falls back gracefully when no courses exist in repository")
    void sampleVariables_fallbackWhenEmpty() {
        when(courseRepository.findAll()).thenReturn(List.of());

        Map<String, String> sample = resolver.sampleVariables();

        assertEquals("Sample Course", sample.get("courseName"));
    }
}
