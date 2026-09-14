package com.careerlabs.lms.api.batch;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.impl.BatchServiceImpl;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchServiceTrainerValidationTest {

    @Mock
    private BatchRepository batchRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private StudentRepository studentRepository;
    @Mock
    private AssignmentRepository assignmentRepository;
    @Mock
    private DailyClassRepository dailyClassRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BatchServiceImpl batchService;

    private Course course;
    private User activeTrainer;
    private User inactiveTrainer;
    private User studentUser;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        course = new Course();
        setId(course, 10L);
        course.setTitle("Java Bootcamp");
        course.setStatus(com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED);

        activeTrainer = new User();
        setId(activeTrainer, 1L);
        activeTrainer.setName("Active Trainer");
        activeTrainer.setEmail("active@trainer.com");
        activeTrainer.setRole(Role.TRAINER);
        activeTrainer.setActive(true);

        inactiveTrainer = new User();
        setId(inactiveTrainer, 2L);
        inactiveTrainer.setName("Inactive Trainer");
        inactiveTrainer.setEmail("inactive@trainer.com");
        inactiveTrainer.setRole(Role.TRAINER);
        inactiveTrainer.setActive(false);

        studentUser = new User();
        setId(studentUser, 3L);
        studentUser.setName("Student User");
        studentUser.setRole(Role.STUDENT);
        studentUser.setActive(true);
    }

    private BatchRequest createRequest(Long trainerId) {
        BatchRequest req = new BatchRequest();
        req.setName("Batch A");
        req.setCourseId(10L);
        req.setTrainerId(trainerId);
        req.setStartDate(LocalDate.of(2026, 9, 1));
        req.setEndDate(LocalDate.of(2026, 12, 1));
        req.setTiming("09:00 AM - 11:00 AM");
        req.setMode(BatchMode.ONLINE);
        req.setMaxStudents(30);
        return req;
    }

    @Test
    @DisplayName("Creating batch with an active trainer succeeds")
    void createBatch_activeTrainer_succeeds() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of());
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> {
            Batch b = invocation.getArgument(0);
            setId(b, 100L);
            return b;
        });

        BatchResponse response = batchService.create(createRequest(1L));

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals("Batch A", response.name());
        verify(batchRepository).save(any(Batch.class));
    }

    @Test
    @DisplayName("Creating batch with an inactive trainer throws BadRequestException")
    void createBatch_inactiveTrainer_throwsBadRequestException() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(inactiveTrainer));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                batchService.create(createRequest(2L))
        );

        assertTrue(ex.getMessage().contains("Cannot assign trainer 'Inactive Trainer': trainer account is inactive."));
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Assigning non-existent trainer throws ResourceNotFoundException")
    void createBatch_nonExistentTrainer_throwsResourceNotFound() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                batchService.create(createRequest(999L))
        );
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Assigning user with non-TRAINER role throws ResourceNotFoundException")
    void createBatch_nonTrainerRole_throwsResourceNotFound() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(studentUser));

        assertThrows(ResourceNotFoundException.class, () ->
                batchService.create(createRequest(3L))
        );
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Updating batch and assigning an inactive trainer throws BadRequestException")
    void updateBatch_assigningInactiveTrainer_throwsBadRequestException() {
        Batch existingBatch = new Batch();
        setId(existingBatch, 50L);
        existingBatch.setName("Existing Batch");
        existingBatch.setCourse(course);
        existingBatch.setTrainerId(1L); // previously assigned to activeTrainer

        when(batchRepository.findById(50L)).thenReturn(Optional.of(existingBatch));
        when(userRepository.findById(2L)).thenReturn(Optional.of(inactiveTrainer));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                batchService.update(50L, createRequest(2L))
        );

        assertTrue(ex.getMessage().contains("Cannot assign trainer 'Inactive Trainer': trainer account is inactive."));
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Updating batch with an inactive trainer (even if previously assigned) throws BadRequestException")
    void updateBatch_keepingExistingInactiveTrainer_throwsBadRequestException() {
        Batch existingBatch = new Batch();
        setId(existingBatch, 50L);
        existingBatch.setName("Existing Batch");
        existingBatch.setCourse(course);
        existingBatch.setTrainerId(2L); // previously assigned to inactiveTrainer

        when(batchRepository.findById(50L)).thenReturn(Optional.of(existingBatch));
        when(userRepository.findById(2L)).thenReturn(Optional.of(inactiveTrainer));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                batchService.update(50L, createRequest(2L))
        );

        assertTrue(ex.getMessage().contains("Cannot assign trainer 'Inactive Trainer': trainer account is inactive."));
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Reactivating a batch with an inactive trainer throws BadRequestException")
    void toggleActive_inactiveTrainer_throwsBadRequestException() {
        Batch existingBatch = new Batch();
        setId(existingBatch, 50L);
        existingBatch.setName("Inactive Batch");
        existingBatch.setCourse(course);
        existingBatch.setTrainerId(2L);
        existingBatch.setActive(false);
        existingBatch.setStartDate(LocalDate.of(2026, 9, 1));
        existingBatch.setEndDate(LocalDate.of(2026, 12, 1));
        existingBatch.setTiming("09:00 AM - 11:00 AM");

        when(batchRepository.findById(50L)).thenReturn(Optional.of(existingBatch));
        when(userRepository.findById(2L)).thenReturn(Optional.of(inactiveTrainer));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                batchService.toggleActive(50L)
        );

        assertTrue(ex.getMessage().contains("Cannot assign trainer 'Inactive Trainer': trainer account is inactive."));
        assertFalse(existingBatch.isActive());
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Reactivating a batch with an active trainer succeeds")
    void toggleActive_activeTrainer_succeeds() {
        Batch existingBatch = new Batch();
        setId(existingBatch, 50L);
        existingBatch.setName("Inactive Batch");
        existingBatch.setCourse(course);
        existingBatch.setTrainerId(1L);
        existingBatch.setActive(false);
        existingBatch.setStartDate(LocalDate.of(2026, 9, 1));
        existingBatch.setEndDate(LocalDate.of(2026, 12, 1));
        existingBatch.setTiming("09:00 AM - 11:00 AM");

        when(batchRepository.findById(50L)).thenReturn(Optional.of(existingBatch));
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of());
        when(batchRepository.save(any(Batch.class))).thenReturn(existingBatch);
        when(studentRepository.countByBatchId(50L)).thenReturn(0L);

        BatchResponse res = batchService.toggleActive(50L);

        assertNotNull(res);
        assertTrue(existingBatch.isActive());
        verify(batchRepository).save(existingBatch);
    }

    @Test
    @DisplayName("Updating batch by reassigning to a new active trainer succeeds")
    void updateBatch_reassigningToActiveTrainer_succeeds() {
        Batch existingBatch = new Batch();
        setId(existingBatch, 50L);
        existingBatch.setName("Existing Batch");
        existingBatch.setCourse(course);
        existingBatch.setTrainerId(2L); // previously assigned to inactiveTrainer

        when(batchRepository.findById(50L)).thenReturn(Optional.of(existingBatch));
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of());
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
        when(batchRepository.save(any(Batch.class))).thenReturn(existingBatch);
        when(studentRepository.countByBatchId(50L)).thenReturn(5L);

        BatchResponse response = batchService.update(50L, createRequest(1L));

        assertNotNull(response);
        assertEquals(50L, response.id());
        verify(batchRepository).save(existingBatch);
    }

    @Test
    @DisplayName("Active trainer with overlapping batch throws ConflictException")
    void createBatch_activeTrainer_overlappingBatch_throwsConflictException() {
        Batch existing = new Batch();
        setId(existing, 200L);
        existing.setName("Existing Active Batch");
        existing.setStartDate(LocalDate.of(2026, 9, 1));
        existing.setEndDate(LocalDate.of(2026, 12, 1));
        existing.setTiming("09:00 AM - 11:00 AM");
        existing.setActive(true);

        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of(existing));

        BatchRequest req = createRequest(1L);
        req.setStartDate(LocalDate.of(2026, 9, 15));
        req.setEndDate(LocalDate.of(2026, 11, 15));
        req.setTiming("10:00 AM - 12:00 PM"); // overlaps

        assertThrows(com.careerlabs.lms.api.common.exception.ConflictException.class, () ->
                batchService.create(req)
        );
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Active trainer with adjacent batch timings 1:00-2:00 and 2:00-3:00 succeeds")
    void createBatch_activeTrainer_adjacentTimings_succeeds() {
        Batch existing = new Batch();
        setId(existing, 200L);
        existing.setName("Existing Batch 1-2");
        existing.setStartDate(LocalDate.of(2026, 9, 1));
        existing.setEndDate(LocalDate.of(2026, 12, 1));
        existing.setTiming("1:00-2:00");
        existing.setActive(true);

        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of(existing));
        when(courseRepository.findById(10L)).thenReturn(Optional.of(course));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BatchRequest req = createRequest(1L);
        req.setStartDate(LocalDate.of(2026, 9, 1));
        req.setEndDate(LocalDate.of(2026, 12, 1));
        req.setTiming("2:00-3:00"); // adjacent -> no overlap

        BatchResponse res = batchService.create(req);
        assertNotNull(res);
        verify(batchRepository).save(any(Batch.class));
    }
}
