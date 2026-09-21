package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
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
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseDeletionTest {

    @Mock private CourseRepository courseRepository;
    @Mock private CourseCodeGenerator courseCodeGenerator;
    @Mock private CourseAccessGuard accessGuard;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private SyllabusModuleRepository moduleRepository;
    @Mock private SyllabusService syllabusService;
    @Mock private MaterialRepository materialRepository;
    @Mock private BatchRepository batchRepository;
    @Mock private PlatformTransactionManager transactionManager;

    private CourseServiceImpl courseService;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    private Course createCourse(Long id, String title) {
        Course c = new Course();
        setId(c, id);
        c.setTitle(title);
        c.setStatus(CourseStatus.PUBLISHED);
        c.setLevel(Level.BEGINNER);
        return c;
    }

    private Batch createBatch(Long id, String name, boolean active, LocalDate endDate) {
        Batch b = new Batch();
        setId(b, id);
        b.setName(name);
        b.setActive(active);
        b.setEndDate(endDate);
        return b;
    }

    @BeforeEach
    void setUp() {
        courseService = new CourseServiceImpl(
                courseRepository,
                courseCodeGenerator,
                accessGuard,
                studentRepository,
                enrollmentRepository,
                moduleRepository,
                syllabusService,
                materialRepository,
                batchRepository,
                transactionManager
        );
    }

    @Test
    @DisplayName("Deleting course with active batch throws ConflictException with active batch details")
    void delete_courseWithActiveBatch_throwsConflictException() {
        Course course = createCourse(1L, "Web Development");
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));

        Batch activeBatch = createBatch(10L, "WD-Summer-2026", true, LocalDate.now().plusMonths(2));
        when(batchRepository.findByCourseId(1L)).thenReturn(List.of(activeBatch));

        ConflictException ex = assertThrows(ConflictException.class, () -> courseService.delete(1L));

        assertTrue(ex.getMessage().contains("Cannot delete course: 1 active/ongoing batch(es) ('WD-Summer-2026') still reference it."));
        assertTrue(ex.getMessage().contains("Please reassign or conclude active batches before deleting this course."));
        verify(courseRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Deleting course with historical/inactive batch throws ConflictException with historical batch details")
    void delete_courseWithHistoricalBatch_throwsConflictException() {
        Course course = createCourse(2L, "Data Science");
        when(courseRepository.findById(2L)).thenReturn(Optional.of(course));

        Batch historicalBatch = createBatch(20L, "DS-Fall-2025", true, LocalDate.now().minusMonths(3));
        when(batchRepository.findByCourseId(2L)).thenReturn(List.of(historicalBatch));

        ConflictException ex = assertThrows(ConflictException.class, () -> courseService.delete(2L));

        assertTrue(ex.getMessage().contains("Cannot delete course: 1 historical/inactive batch(es) ('DS-Fall-2025') still reference it."));
        assertTrue(ex.getMessage().contains("Please remove historical/archived batch records before deleting this course."));
        verify(courseRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Deleting course with both active and inactive batches throws composite ConflictException message")
    void delete_courseWithBothActiveAndInactiveBatches_throwsConflictException() {
        Course course = createCourse(3L, "Cloud Computing");
        when(courseRepository.findById(3L)).thenReturn(Optional.of(course));

        Batch activeBatch = createBatch(31L, "CC-Active", true, LocalDate.now().plusMonths(1));
        Batch inactiveBatch = createBatch(32L, "CC-Archived", false, LocalDate.now().minusMonths(1));
        when(batchRepository.findByCourseId(3L)).thenReturn(List.of(activeBatch, inactiveBatch));

        ConflictException ex = assertThrows(ConflictException.class, () -> courseService.delete(3L));

        assertTrue(ex.getMessage().contains("1 active/ongoing batch(es) ('CC-Active')"));
        assertTrue(ex.getMessage().contains("1 historical/inactive batch(es) ('CC-Archived')"));
        verify(courseRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Deleting course with more than 3 batches truncates batch names with 'and X more'")
    void delete_courseWithManyBatches_formatsBatchNamesWithMore() {
        Course course = createCourse(4L, "AI & ML");
        when(courseRepository.findById(4L)).thenReturn(Optional.of(course));

        List<Batch> batches = List.of(
                createBatch(41L, "AIML-1", true, LocalDate.now().plusDays(10)),
                createBatch(42L, "AIML-2", true, LocalDate.now().plusDays(20)),
                createBatch(43L, "AIML-3", true, LocalDate.now().plusDays(30)),
                createBatch(44L, "AIML-4", true, LocalDate.now().plusDays(40)),
                createBatch(45L, "AIML-5", true, LocalDate.now().plusDays(50))
        );
        when(batchRepository.findByCourseId(4L)).thenReturn(batches);

        ConflictException ex = assertThrows(ConflictException.class, () -> courseService.delete(4L));

        assertTrue(ex.getMessage().contains("5 active/ongoing batch(es) ('AIML-1', 'AIML-2', 'AIML-3' and 2 more) still reference it."));
        verify(courseRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Deleting course without any batches successfully deletes course and cascades related entities")
    void delete_courseWithoutBatches_succeeds() {
        Course course = createCourse(5L, "DevOps Intro");
        when(courseRepository.findById(5L)).thenReturn(Optional.of(course));
        when(batchRepository.findByCourseId(5L)).thenReturn(Collections.emptyList());
        when(moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(5L)).thenReturn(Collections.emptyList());

        courseService.delete(5L);

        verify(materialRepository).deleteAllByCourseId(5L);
        verify(enrollmentRepository).deleteAllByCourseId(5L);
        verify(courseRepository).delete(course);
    }

    @Test
    @DisplayName("Deleting non-existent course throws ResourceNotFoundException")
    void delete_courseNotFound_throwsResourceNotFoundException() {
        when(courseRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> courseService.delete(999L));

        verify(batchRepository, never()).findByCourseId(any());
        verify(courseRepository, never()).delete(any());
    }
}
