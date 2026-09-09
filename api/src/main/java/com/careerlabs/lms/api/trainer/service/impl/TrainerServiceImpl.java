package com.careerlabs.lms.api.trainer.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.trainer.dto.request.TrainerCreateRequest;
import com.careerlabs.lms.api.trainer.dto.request.TrainerUpdateRequest;
import com.careerlabs.lms.api.trainer.dto.response.TrainerPageResponse;
import com.careerlabs.lms.api.trainer.dto.response.TrainerResponse;
import com.careerlabs.lms.api.trainer.service.TrainerService;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TrainerServiceImpl implements TrainerService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BatchRepository batchRepository;

    public TrainerServiceImpl(UserRepository userRepository,
                              PasswordEncoder passwordEncoder,
                              BatchRepository batchRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.batchRepository = batchRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public TrainerPageResponse listTrainers(String search, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("role"), Role.TRAINER));

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate emailLike = cb.like(cb.lower(root.get("email")), searchPattern);
                predicates.add(cb.or(nameLike, emailLike));
            }

            if ("active".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("active"), true));
            } else if ("inactive".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("active"), false));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);
        List<User> users = userPage.getContent();
        List<Long> trainerIds = users.stream().map(User::getId).toList();

        Map<Long, List<Batch>> batchesByTrainerId = trainerIds.isEmpty() ? Map.of() :
                batchRepository.findByTrainerIdInOrderByCreatedAtDesc(trainerIds).stream()
                        .filter(b -> b.getTrainerId() != null)
                        .collect(Collectors.groupingBy(Batch::getTrainerId));

        List<TrainerResponse> trainerResponses = users.stream()
                .map(u -> TrainerResponse.from(u, batchesByTrainerId.getOrDefault(u.getId(), List.of())))
                .toList();

        return new TrainerPageResponse(
                trainerResponses,
                userPage.getTotalElements(),
                userPage.getTotalPages(),
                userPage.getNumber() + 1
        );
    }

    @Override
    @Transactional(readOnly = true)
    public TrainerResponse getTrainer(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + id));
        List<Batch> batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(id);
        return TrainerResponse.from(user, batches);
    }

    @Override
    @Transactional
    public TrainerResponse createTrainer(TrainerCreateRequest request) {
        if (userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            throw new ConflictException("User already exists with email: " + request.getEmail());
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.TRAINER);
        user.setActive(true);
        user.setPhone(request.getPhone());
        user.setDesignation(request.getDesignation());
        user.setDepartment(request.getDepartment());

        User saved = userRepository.save(user);

        if (request.getBatchId() != null) {
            Batch batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.getBatchId()));
            batch.setTrainerId(saved.getId());
            batchRepository.save(batch);
        } else if (request.getBatchIds() != null && !request.getBatchIds().isEmpty()) {
            for (Long bId : request.getBatchIds()) {
                batchRepository.findById(bId).ifPresent(b -> {
                    b.setTrainerId(saved.getId());
                    batchRepository.save(b);
                });
            }
        }

        List<Batch> batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(saved.getId());
        return TrainerResponse.from(saved, batches);
    }

    @Override
    @Transactional
    public TrainerResponse updateTrainer(Long id, TrainerUpdateRequest request) {
        User user = userRepository.findById(id)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + id));

        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) &&
                userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            throw new ConflictException("User already exists with email: " + request.getEmail());
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setDesignation(request.getDesignation());
        user.setDepartment(request.getDepartment());

        User saved = userRepository.save(user);

        if (request.getBatchId() != null) {
            Batch batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.getBatchId()));
            batch.setTrainerId(saved.getId());
            batchRepository.save(batch);
        }

        List<Batch> batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(id);
        return TrainerResponse.from(saved, batches);
    }

    @Override
    @Transactional
    public TrainerResponse toggleTrainerStatus(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + id));

        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        List<Batch> batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(id);
        return TrainerResponse.from(saved, batches);
    }

    @Override
    @Transactional
    public void deleteTrainer(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + id));

        List<Batch> batches = batchRepository.findByTrainerId(id);
        if (!batches.isEmpty()) {
            throw new ConflictException("Cannot delete trainer: they are currently assigned to " + batches.size() + " batch(es). Please reassign or unassign the batches first.");
        }

        userRepository.delete(user);
    }
}
