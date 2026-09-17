package com.careerlabs.lms.api.trainer;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.trainer.dto.request.TrainerUpdateRequest;
import com.careerlabs.lms.api.trainer.dto.response.TrainerResponse;
import com.careerlabs.lms.api.trainer.service.impl.TrainerServiceImpl;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainerServiceBatchValidationTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private BatchRepository batchRepository;

    @InjectMocks
    private TrainerServiceImpl trainerService;

    private User activeTrainer;
    private User inactiveTrainer;
    private Batch batch1;
    private Batch batch2Overlapping;
    private Batch batch3NonOverlapping;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
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

        batch1 = new Batch();
        setId(batch1, 100L);
        batch1.setName("Batch 1");
        batch1.setStartDate(LocalDate.of(2026, 9, 1));
        batch1.setEndDate(LocalDate.of(2026, 12, 1));
        batch1.setTiming("09:00 AM - 11:00 AM");
        batch1.setActive(true);

        batch2Overlapping = new Batch();
        setId(batch2Overlapping, 101L);
        batch2Overlapping.setName("Batch 2 Overlapping");
        batch2Overlapping.setStartDate(LocalDate.of(2026, 9, 15));
        batch2Overlapping.setEndDate(LocalDate.of(2026, 11, 15));
        batch2Overlapping.setTiming("10:00 AM - 12:00 PM");
        batch2Overlapping.setActive(true);

        batch3NonOverlapping = new Batch();
        setId(batch3NonOverlapping, 102L);
        batch3NonOverlapping.setName("Batch 3 Non-Overlapping");
        batch3NonOverlapping.setStartDate(LocalDate.of(2026, 9, 1));
        batch3NonOverlapping.setEndDate(LocalDate.of(2026, 12, 1));
        batch3NonOverlapping.setTiming("02:00 PM - 04:00 PM");
        batch3NonOverlapping.setActive(true);
    }

    private TrainerUpdateRequest createUpdateRequest(Long batchId, String email) {
        TrainerUpdateRequest req = new TrainerUpdateRequest();
        req.setName("Updated Name");
        req.setEmail(email);
        req.setBatchId(batchId);
        return req;
    }

    @Test
    @DisplayName("Inactive trainer + TrainerService assignment -> FAIL with BadRequestException")
    void updateTrainer_inactiveTrainer_assignBatch_throwsBadRequestException() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(inactiveTrainer));
        when(userRepository.save(any(User.class))).thenReturn(inactiveTrainer);
        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                trainerService.updateTrainer(2L, createUpdateRequest(100L, "inactive@trainer.com"))
        );

        assertTrue(ex.getMessage().contains("trainer account is inactive."));
        verify(batchRepository, never()).save(any(Batch.class));
    }

    @Test
    @DisplayName("Active trainer + TrainerService assignment -> PASS")
    void updateTrainer_activeTrainer_assignBatch_succeeds() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(userRepository.save(any(User.class))).thenReturn(activeTrainer);
        when(batchRepository.findById(100L)).thenReturn(Optional.of(batch1));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of());
        when(batchRepository.save(any(Batch.class))).thenReturn(batch1);
        when(batchRepository.findByTrainerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(batch1));

        TrainerResponse res = trainerService.updateTrainer(1L, createUpdateRequest(100L, "active@trainer.com"));

        assertNotNull(res);
        assertTrue(batch1.hasTrainer(1L));
        verify(batchRepository).save(batch1);
    }

    @Test
    @DisplayName("Active trainer + overlapping TrainerService assignment -> FAIL with ConflictException")
    void updateTrainer_activeTrainer_overlappingBatch_throwsConflictException() {
        // activeTrainer is already assigned to batch1
        batch1.setTrainers(Set.of(activeTrainer));

        when(userRepository.findById(1L)).thenReturn(Optional.of(activeTrainer));
        when(userRepository.save(any(User.class))).thenReturn(activeTrainer);
        // Trying to assign batch2Overlapping to activeTrainer
        when(batchRepository.findById(101L)).thenReturn(Optional.of(batch2Overlapping));
        when(batchRepository.findByTrainerIdAndActiveTrue(1L)).thenReturn(List.of(batch1));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                trainerService.updateTrainer(1L, createUpdateRequest(101L, "active@trainer.com"))
        );

        assertTrue(ex.getMessage().contains("Trainer is already assigned to batch 'Batch 1'"));
        verify(batchRepository, never()).save(batch2Overlapping);
    }
}
