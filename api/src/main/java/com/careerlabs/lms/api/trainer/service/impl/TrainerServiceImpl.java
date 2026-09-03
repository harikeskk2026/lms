package com.careerlabs.lms.api.trainer.service.impl;

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

@Service
public class TrainerServiceImpl implements TrainerService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TrainerServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
        List<TrainerResponse> trainerResponses = userPage.getContent().stream()
                .map(TrainerResponse::from)
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
        return TrainerResponse.from(user);
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
        return TrainerResponse.from(saved);
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
        return TrainerResponse.from(saved);
    }

    @Override
    @Transactional
    public TrainerResponse toggleTrainerStatus(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + id));

        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        return TrainerResponse.from(saved);
    }

    @Override
    @Transactional
    public void deleteTrainer(Long id) {
        User user = userRepository.findById(id)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + id));

        userRepository.delete(user);
    }
}
