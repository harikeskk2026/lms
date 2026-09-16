package com.careerlabs.lms.api.trainer;

import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.trainer.dto.response.TrainerPageResponse;
import com.careerlabs.lms.api.trainer.service.impl.TrainerServiceImpl;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrainerServicePaginationAndCountTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private BatchRepository batchRepository;

    @InjectMocks
    private TrainerServiceImpl trainerService;

    @Test
    @DisplayName("listTrainers should return server-side paginated results with system-wide totalActive and totalInactive counts")
    void testListTrainersReturnsTotalActiveAndInactive() {
        User t1 = new User();
        ReflectionTestUtils.setField(t1, "id", 1L);
        t1.setName("Trainer 1");
        t1.setEmail("t1@test.com");
        t1.setRole(Role.TRAINER);
        t1.setActive(false);

        User t2 = new User();
        ReflectionTestUtils.setField(t2, "id", 2L);
        t2.setName("Trainer 2");
        t2.setEmail("t2@test.com");
        t2.setRole(Role.TRAINER);
        t2.setActive(false);

        // Page 1 has 2 inactive trainers, but system-wide there are 65 active and 36 inactive out of 101 total
        Page<User> pageResult = new PageImpl<>(List.of(t1, t2), Pageable.ofSize(10), 101);

        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(pageResult);
        when(userRepository.countByRoleAndActive(Role.TRAINER, true)).thenReturn(65L);
        when(userRepository.countByRoleAndActive(Role.TRAINER, false)).thenReturn(36L);
        when(batchRepository.findByTrainerIdInOrderByCreatedAtDesc(any())).thenReturn(List.of());

        TrainerPageResponse response = trainerService.listTrainers(null, null, 1, 10);

        assertNotNull(response);
        assertEquals(2, response.getTrainers().size());
        assertEquals(101L, response.getTotalElements());
        assertEquals(11, response.getTotalPages());
        assertEquals(1, response.getCurrentPage());
        assertEquals(65L, response.getTotalActive(), "totalActive must reflect system-wide count, not current page");
        assertEquals(36L, response.getTotalInactive(), "totalInactive must reflect system-wide count, not current page");
    }
}
