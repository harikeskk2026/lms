package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.service.impl.BatchServiceImpl;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
import com.careerlabs.lms.api.course.entity.Level;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseStatusTransitionTest {

    @Mock private CourseRepository courseRepository;
    @Mock private SlugGenerator slugGenerator;
    @Mock private CourseAccessGuard accessGuard;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private SyllabusModuleRepository moduleRepository;
    @Mock private SyllabusService syllabusService;
    @Mock private MaterialRepository materialRepository;

    @Mock private com.careerlabs.lms.api.batch.repository.BatchRepository batchRepository;
    @Mock private com.careerlabs.lms.api.assignment.repository.AssignmentRepository assignmentRepository;
    @Mock private com.careerlabs.lms.api.attendance.repository.DailyClassRepository dailyClassRepository;
    @Mock private com.careerlabs.lms.api.user.repository.UserRepository userRepository;

    private CourseServiceImpl courseService;
    private BatchServiceImpl batchService;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    private Course courseWithStatus(CourseStatus status) {
        Course c = new Course();
        setId(c, 1L);
        c.setTitle("Test Course");
        c.setDescription("Desc");
        c.setDuration("3 months");
        c.setLevel(Level.BEGINNER);
        c.setStatus(status);
        c.setSlug("test-course");
        return c;
    }

    private CourseRequest requestWithStatus(CourseStatus status) {
        CourseRequest r = new CourseRequest();
        r.setTitle("Test Course Updated");
        r.setDescription("Desc updated");
        r.setDuration("3 months");
        r.setLevel(Level.BEGINNER);
        r.setStatus(status);
        return r;
    }

    @BeforeEach
    void setUp() {
        courseService = new CourseServiceImpl(courseRepository, slugGenerator, accessGuard, studentRepository, enrollmentRepository, moduleRepository, syllabusService, materialRepository, batchRepository);
        batchService = new BatchServiceImpl(batchRepository, courseRepository, studentRepository, assignmentRepository, dailyClassRepository, userRepository, accessGuard);
    }

    @Test
    @DisplayName("DRAFT -> PUBLISHED via PATCH = ALLOW")
    void patch_draft_to_published_allow() {
        Course c = courseWithStatus(CourseStatus.DRAFT);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.updateStatus(1L, CourseStatus.PUBLISHED);
        assertEquals(CourseStatus.PUBLISHED, resp.status());
    }

    @Test
    @DisplayName("DRAFT -> PUBLISHED via PUT = ALLOW and keeps content editable")
    void put_draft_to_published_allow() {
        Course c = courseWithStatus(CourseStatus.DRAFT);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.update(1L, requestWithStatus(CourseStatus.PUBLISHED));
        assertEquals(CourseStatus.PUBLISHED, resp.status());
        assertEquals("Test Course Updated", resp.title());
    }

    @Test
    @DisplayName("DRAFT -> ARCHIVED via PATCH = REJECT")
    void patch_draft_to_archived_reject() {
        Course c = courseWithStatus(CourseStatus.DRAFT);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        BadRequestException ex = assertThrows(BadRequestException.class, () -> courseService.updateStatus(1L, CourseStatus.ARCHIVED));
        assertTrue(ex.getMessage().contains("Invalid status transition"));
    }

    @Test
    @DisplayName("DRAFT -> ARCHIVED via PUT = REJECT")
    void put_draft_to_archived_reject() {
        Course c = courseWithStatus(CourseStatus.DRAFT);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        assertThrows(BadRequestException.class, () -> courseService.update(1L, requestWithStatus(CourseStatus.ARCHIVED)));
    }

    @Test
    @DisplayName("PUBLISHED -> DRAFT via PATCH = REJECT")
    void patch_published_to_draft_reject() {
        Course c = courseWithStatus(CourseStatus.PUBLISHED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        BadRequestException ex = assertThrows(BadRequestException.class, () -> courseService.updateStatus(1L, CourseStatus.DRAFT));
        assertTrue(ex.getMessage().contains("Invalid status transition"));
    }

    @Test
    @DisplayName("PUBLISHED -> DRAFT via PUT = REJECT")
    void put_published_to_draft_reject() {
        Course c = courseWithStatus(CourseStatus.PUBLISHED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        assertThrows(BadRequestException.class, () -> courseService.update(1L, requestWithStatus(CourseStatus.DRAFT)));
    }

    @Test
    @DisplayName("PUBLISHED -> ARCHIVED via PATCH = ALLOW")
    void patch_published_to_archived_allow() {
        Course c = courseWithStatus(CourseStatus.PUBLISHED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.updateStatus(1L, CourseStatus.ARCHIVED);
        assertEquals(CourseStatus.ARCHIVED, resp.status());
    }

    @Test
    @DisplayName("ARCHIVED -> DRAFT via PATCH = ALLOW (Unarchive)")
    void patch_archived_to_draft_allow() {
        Course c = courseWithStatus(CourseStatus.ARCHIVED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.updateStatus(1L, CourseStatus.DRAFT);
        assertEquals(CourseStatus.DRAFT, resp.status());
    }

    @Test
    @DisplayName("ARCHIVED -> PUBLISHED via PATCH = ALLOW (Unarchive)")
    void patch_archived_to_published_allow() {
        Course c = courseWithStatus(CourseStatus.ARCHIVED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.updateStatus(1L, CourseStatus.PUBLISHED);
        assertEquals(CourseStatus.PUBLISHED, resp.status());
    }

    @Test
    @DisplayName("ARCHIVED -> DRAFT via PUT = ALLOW (Unarchive)")
    void put_archived_to_draft_allow() {
        Course c = courseWithStatus(CourseStatus.ARCHIVED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.update(1L, requestWithStatus(CourseStatus.DRAFT));
        assertEquals(CourseStatus.DRAFT, resp.status());
    }

    @Test
    @DisplayName("ARCHIVED -> PUBLISHED via PUT = ALLOW (Unarchive)")
    void put_archived_to_published_allow() {
        Course c = courseWithStatus(CourseStatus.ARCHIVED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        var resp = courseService.update(1L, requestWithStatus(CourseStatus.PUBLISHED));
        assertEquals(CourseStatus.PUBLISHED, resp.status());
    }

    @Test
    @DisplayName("Same status PUBLISHED -> PUBLISHED is safe no-op")
    void same_status_noop() {
        Course c = courseWithStatus(CourseStatus.PUBLISHED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        var resp = courseService.updateStatus(1L, CourseStatus.PUBLISHED);
        assertEquals(CourseStatus.PUBLISHED, resp.status());
        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Editing PUBLISHED course content without changing status succeeds and preserves status")
    void edit_published_content_preserves_status() {
        Course c = courseWithStatus(CourseStatus.PUBLISHED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(c));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));
        CourseRequest r = requestWithStatus(CourseStatus.PUBLISHED);
        r.setTitle("New Title But Same Status");
        var resp = courseService.update(1L, r);
        assertEquals(CourseStatus.PUBLISHED, resp.status());
        assertEquals("New Title But Same Status", resp.title());
    }

    @Test
    @DisplayName("Creating course directly as ARCHIVED is rejected")
    void create_archived_reject() {
        CourseRequest r = requestWithStatus(CourseStatus.ARCHIVED);
        assertThrows(BadRequestException.class, () -> courseService.create(r));
    }

    @Test
    @DisplayName("Default Course entity status is DRAFT")
    void default_status_is_draft() {
        Course c = new Course();
        assertEquals(CourseStatus.DRAFT, c.getStatus());
    }

    @Test
    @DisplayName("Batch creation with DRAFT course is rejected")
    void batch_create_draft_course_reject() {
        Course draft = courseWithStatus(CourseStatus.DRAFT);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(draft));
        BatchRequest req = new BatchRequest();
        req.setName("Batch A"); req.setCourseId(1L);
        req.setStartDate(LocalDate.of(2026,9,1)); req.setEndDate(LocalDate.of(2026,12,1));
        req.setMode(BatchMode.ONLINE); req.setMaxStudents(20);
        BadRequestException ex = assertThrows(BadRequestException.class, () -> batchService.create(req));
        assertTrue(ex.getMessage().contains("not PUBLISHED"));
    }

    @Test
    @DisplayName("Batch creation with ARCHIVED course is rejected")
    void batch_create_archived_course_reject() {
        Course archived = courseWithStatus(CourseStatus.ARCHIVED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(archived));
        BatchRequest req = new BatchRequest();
        req.setName("Batch A"); req.setCourseId(1L);
        req.setStartDate(LocalDate.of(2026,9,1)); req.setEndDate(LocalDate.of(2026,12,1));
        req.setMode(BatchMode.ONLINE); req.setMaxStudents(20);
        assertThrows(BadRequestException.class, () -> batchService.create(req));
    }

    @Test
    @DisplayName("Batch creation with PUBLISHED course succeeds")
    void batch_create_published_succeeds() {
        Course published = courseWithStatus(CourseStatus.PUBLISHED);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(published));
        when(batchRepository.save(any())).thenAnswer(i -> { var b = (com.careerlabs.lms.api.batch.entity.Batch) i.getArgument(0); setId(b, 10L); return b; });
        BatchRequest req = new BatchRequest();
        req.setName("Batch A"); req.setCourseId(1L);
        req.setStartDate(LocalDate.of(2026,9,1)); req.setEndDate(LocalDate.of(2026,12,1));
        req.setMode(BatchMode.ONLINE); req.setMaxStudents(20);
        var resp = batchService.create(req);
        assertNotNull(resp);
    }
}
