package com.careerlabs.lms.api.student.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class StudentCourseResponseTest {

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @Test
    @DisplayName("of(Enrollment, Batch, Course, int, int) maps id, enrolledAt, and thumbnail correctly")
    void of_withEnrollment_mapsIdEnrolledAtAndThumbnail() {
        Course course = new Course();
        setId(course, 101L);
        course.setTitle("Full Stack Java");
        course.setLevel(Level.INTERMEDIATE);
        course.setDuration("12 weeks");
        course.setThumbnail("thumbnails/java-101.png");

        Batch batch = new Batch();
        setId(batch, 201L);
        batch.setName("FSJ-Batch-1");
        batch.setMode(BatchMode.ONLINE);
        batch.setStartDate(LocalDate.of(2026, 1, 15));
        batch.setEndDate(LocalDate.of(2026, 4, 15));
        batch.setTiming("Mon-Fri 10:00 AM");

        Enrollment enrollment = new Enrollment();
        setId(enrollment, 301L);
        Instant enrolledTime = Instant.parse("2026-01-10T09:30:00Z");
        enrollment.setEnrolledAt(enrolledTime);

        StudentCourseResponse response = StudentCourseResponse.of(enrollment, batch, course, 5, 20);

        assertEquals(301L, response.id());
        assertEquals(enrolledTime, response.enrolledAt());
        assertEquals(101L, response.courseId());
        assertNotNull(response.course());
        assertEquals("Full Stack Java", response.course().title());
        assertEquals("thumbnails/java-101.png", response.course().thumbnail());
        assertNotNull(response.batch());
        assertEquals(201L, response.batch().id());
        assertEquals("FSJ-Batch-1", response.batch().name());
        assertNotNull(response.progress());
        assertEquals(5, response.progress().completed());
        assertEquals(20, response.progress().total());
        assertEquals(25, response.progress().pct());
    }

    @Test
    @DisplayName("of(Batch, Course, int, int) overload provides backward compatibility with null id and enrolledAt")
    void of_withoutEnrollment_defaultsIdAndEnrolledAtToNull() {
        Course course = new Course();
        setId(course, 102L);
        course.setTitle("Python Data Science");
        course.setThumbnail("thumbnails/python.png");

        Batch batch = new Batch();
        setId(batch, 202L);
        batch.setName("DS-Batch-1");

        StudentCourseResponse response = StudentCourseResponse.of(batch, course, 10, 10);

        assertNull(response.id());
        assertNull(response.enrolledAt());
        assertEquals(102L, response.courseId());
        assertNotNull(response.course());
        assertEquals("thumbnails/python.png", response.course().thumbnail());
        assertEquals(100, response.progress().pct());
    }

    @Test
    @DisplayName("CourseInfo.from(null) returns null safely")
    void courseInfo_fromNull_returnsNull() {
        assertNull(StudentCourseResponse.CourseInfo.from(null));
    }

    @Test
    @DisplayName("StudentCourseResponse with null course and batch handles gracefully")
    void of_nullCourseAndBatch_doesNotThrow() {
        StudentCourseResponse response = StudentCourseResponse.of(null, null, null, 0, 0);

        assertNull(response.id());
        assertNull(response.enrolledAt());
        assertNull(response.courseId());
        assertNull(response.course());
        assertNull(response.batch());
        assertNotNull(response.progress());
        assertEquals(0, response.progress().pct());
    }
}
