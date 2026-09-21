package com.careerlabs.lms.api.trainer.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.common.dto.response.ImportRowError;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.util.CsvParser;
import com.careerlabs.lms.api.common.util.ImportValidators;
import com.careerlabs.lms.api.common.util.ScheduleOverlapUtil;
import com.careerlabs.lms.api.trainer.dto.request.CourseBatchAssignment;
import com.careerlabs.lms.api.trainer.dto.request.TrainerCreateRequest;
import com.careerlabs.lms.api.trainer.dto.request.TrainerUpdateRequest;
import com.careerlabs.lms.api.trainer.dto.response.TrainerPageResponse;
import com.careerlabs.lms.api.trainer.dto.response.TrainerResponse;
import com.careerlabs.lms.api.trainer.service.TrainerService;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TrainerServiceImpl implements TrainerService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BatchRepository batchRepository;
    private final TransactionTemplate transactionTemplate;

    public TrainerServiceImpl(UserRepository userRepository,
                              PasswordEncoder passwordEncoder,
                              BatchRepository batchRepository,
                              PlatformTransactionManager transactionManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.batchRepository = batchRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    @Transactional(readOnly = true)
    public TrainerPageResponse listTrainers(String search, String status, Long batchId, int page, int limit) {
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

            if (batchId != null) {
                Subquery<Long> subquery = query.subquery(Long.class);
                var batchRoot = subquery.from(Batch.class);
                Join<Batch, User> trainerJoin = batchRoot.join("trainers");
                subquery.select(trainerJoin.get("id")).where(cb.equal(batchRoot.get("id"), batchId));
                predicates.add(root.get("id").in(subquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);
        List<User> users = userPage.getContent();
        List<Long> trainerIds = users.stream().map(User::getId).toList();

        // A batch can now have several trainers, so it may need to appear
        // under more than one trainer's key here - not a simple groupingBy.
        Map<Long, List<Batch>> batchesByTrainerId = new HashMap<>();
        if (!trainerIds.isEmpty()) {
            for (Batch batch : batchRepository.findByTrainerIdInOrderByCreatedAtDesc(trainerIds)) {
                for (User t : batch.getTrainers()) {
                    if (trainerIds.contains(t.getId())) {
                        batchesByTrainerId.computeIfAbsent(t.getId(), k -> new ArrayList<>()).add(batch);
                    }
                }
            }
        }

        List<TrainerResponse> trainerResponses = users.stream()
                .map(u -> TrainerResponse.from(u, batchesByTrainerId.getOrDefault(u.getId(), List.of())))
                .toList();

        long totalActive = userRepository.countByRoleAndActive(Role.TRAINER, true);
        long totalInactive = userRepository.countByRoleAndActive(Role.TRAINER, false);

        return new TrainerPageResponse(
                trainerResponses,
                userPage.getTotalElements(),
                userPage.getTotalPages(),
                userPage.getNumber() + 1,
                totalActive,
                totalInactive
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

        List<Long> desiredBatchIds = resolveDesiredBatchIds(
                request.getCourseBatchAssignments(), request.getBatchIds(), request.getBatchId());

        if (desiredBatchIds != null && !desiredBatchIds.isEmpty()) {
            List<Batch> batchesToAssign = new ArrayList<>();
            for (Long bId : new LinkedHashSet<>(desiredBatchIds)) {
                Batch b = batchRepository.findById(bId)
                        .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + bId));
                validateTrainerAssignment(saved, b);
                for (Batch other : batchesToAssign) {
                    if (ScheduleOverlapUtil.isScheduleOverlap(b, other)) {
                        throw new ConflictException(String.format(
                                "Batch '%s' overlaps with batch '%s' in the assignment list. Batch timings must not overlap.",
                                b.getName(), other.getName()
                        ));
                    }
                }
                batchesToAssign.add(b);
            }
            for (Batch b : batchesToAssign) {
                b.getTrainers().add(saved);
                batchRepository.save(b);
            }
        }

        List<Batch> batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(saved.getId());
        return TrainerResponse.from(saved, batches);
    }

    @Override
    public BulkImportResponse<TrainerResponse> bulkImportTrainers(MultipartFile file, String defaultPassword) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded CSV file is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("CSV file size exceeds the 5MB limit");
        }

        CsvParser.ParseResult parseResult;
        try {
            parseResult = CsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new BadRequestException("Failed to read CSV file: " + e.getMessage());
        }

        List<CsvParser.ParsedRow> rows = parseResult.getRows();
        if (rows.isEmpty()) {
            throw new BadRequestException("CSV file contains no trainer data rows");
        }
        if (rows.size() > 1000) {
            throw new BadRequestException("CSV file exceeds maximum limit of 1000 rows");
        }

        boolean hasNameHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("name"));
        boolean hasEmailHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("email"));
        if (!hasNameHeader || !hasEmailHeader) {
            throw new BadRequestException("CSV file must contain 'Name' and 'Email' columns");
        }

        String resolvedDefaultPassword = (defaultPassword == null || defaultPassword.isBlank())
                ? "Trainer@123"
                : defaultPassword.trim();
        if (resolvedDefaultPassword.length() < 6) {
            throw new BadRequestException("Default password must be at least 6 characters");
        }

        Set<String> seenEmailsInCsv = new HashSet<>();
        List<TrainerResponse> importedTrainers = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();

        for (CsvParser.ParsedRow row : rows) {
            int rowNum = row.getRowNumber();

            String name = row.get("name", "trainername", "fullname", "trainer_name");
            if (name == null || name.trim().length() < 2 || name.trim().length() > 150) {
                errors.add(new ImportRowError(rowNum, name != null ? name : "", "Name is required (2 to 150 characters)"));
                continue;
            }
            name = name.trim();

            String rawEmail = row.get("email", "traineremail", "emailaddress", "trainer_email");
            if (rawEmail == null || rawEmail.trim().isEmpty()) {
                errors.add(new ImportRowError(rowNum, name, "Email is required"));
                continue;
            }
            String email = rawEmail.trim().toLowerCase(Locale.ROOT);
            if (!ImportValidators.isValidEmail(email)) {
                errors.add(new ImportRowError(rowNum, name, "Invalid email address format"));
                continue;
            }
            if (!seenEmailsInCsv.add(email)) {
                errors.add(new ImportRowError(rowNum, name, "Duplicate email '" + email + "' found within this CSV sheet"));
                continue;
            }
            if (userRepository.existsByEmailIgnoreCase(email)) {
                errors.add(new ImportRowError(rowNum, name, "Email '" + email + "' is already registered in the system"));
                continue;
            }

            String phone = row.get("phone", "phonenumber", "mobile", "contact", "mobile_number");
            if (phone != null) {
                phone = phone.replaceAll("\\D", "").trim();
                if (phone.isEmpty()) {
                    phone = null;
                } else if (!ImportValidators.isValidPhone(phone)) {
                    errors.add(new ImportRowError(rowNum, name, "Phone number must be a valid 10-digit number starting with 6-9"));
                    continue;
                }
            }

            String password = row.get("password");
            if (password == null || password.trim().isEmpty()) {
                password = resolvedDefaultPassword;
            } else {
                password = password.trim();
                if (password.length() < 6) {
                    errors.add(new ImportRowError(rowNum, name, "Password must be at least 6 characters"));
                    continue;
                }
            }

            final String fName = name;
            final String fEmail = email;
            final String fPhone = phone;
            final String fPassword = password;
            final String designation = row.get("designation", "designationtitle", "role");
            final String department = row.get("department", "dept", "departmentname");

            try {
                TrainerResponse created = transactionTemplate.execute(status -> {
                    User user = new User();
                    user.setName(fName);
                    user.setEmail(fEmail);
                    user.setPasswordHash(passwordEncoder.encode(fPassword));
                    user.setRole(Role.TRAINER);
                    user.setActive(true);
                    user.setPhone(fPhone);
                    user.setDesignation(designation);
                    user.setDepartment(department);
                    User saved = userRepository.save(user);
                    return TrainerResponse.from(saved);
                });
                if (created != null) {
                    importedTrainers.add(created);
                }
            } catch (Exception ex) {
                errors.add(new ImportRowError(rowNum, fName, "Failed to create trainer: " + ex.getMessage()));
            }
        }

        return new BulkImportResponse<>(rows.size(), importedTrainers.size(), errors.size(), importedTrainers, errors);
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

        List<Long> desiredBatchIds = resolveDesiredBatchIds(
                request.getCourseBatchAssignments(), request.getBatchIds(), request.getBatchId());

        if (desiredBatchIds != null) {
            List<Batch> currentBatches = batchRepository.findByTrainerId(id);
            Set<Long> desiredIdSet = new HashSet<>(desiredBatchIds);

            // Unassign first, so a batch being dropped doesn't block validation
            // of a newly desired batch that would otherwise conflict with it.
            for (Batch existing : currentBatches) {
                if (!desiredIdSet.contains(existing.getId())) {
                    existing.getTrainers().remove(saved);
                    batchRepository.save(existing);
                }
            }

            Set<Long> currentIds = currentBatches.stream().map(Batch::getId).collect(Collectors.toSet());
            List<Batch> batchesToAssign = new ArrayList<>();
            for (Long bId : desiredIdSet) {
                if (currentIds.contains(bId)) {
                    continue;
                }
                Batch b = batchRepository.findById(bId)
                        .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + bId));
                validateTrainerAssignment(saved, b);
                for (Batch other : batchesToAssign) {
                    if (ScheduleOverlapUtil.isScheduleOverlap(b, other)) {
                        throw new ConflictException(String.format(
                                "Batch '%s' overlaps with batch '%s' in the assignment list. Batch timings must not overlap.",
                                b.getName(), other.getName()
                        ));
                    }
                }
                batchesToAssign.add(b);
            }
            for (Batch b : batchesToAssign) {
                b.getTrainers().add(saved);
                batchRepository.save(b);
            }
        }

        List<Batch> batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(id);
        return TrainerResponse.from(saved, batches);
    }

    /**
     * Resolves the trainer's desired batch set from whichever shape the
     * request used, in priority order: explicit course groups (validated -
     * each batch must actually belong to the course it was grouped under),
     * then a flat batchIds list, then the legacy singular batchId.
     * Returns null only when none of the three were provided at all (caller
     * should treat that as "no change requested" - distinct from an empty
     * list, which means "unassign everything").
     */
    private List<Long> resolveDesiredBatchIds(List<CourseBatchAssignment> assignments, List<Long> batchIds, Long batchId) {
        if (assignments != null) {
            List<Long> resolved = new ArrayList<>();
            for (CourseBatchAssignment assignment : assignments) {
                if (assignment.getCourseId() == null || assignment.getBatchIds() == null) {
                    continue;
                }
                for (Long bId : assignment.getBatchIds()) {
                    Batch b = batchRepository.findById(bId)
                            .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + bId));
                    if (b.getCourse() == null || !b.getCourse().getId().equals(assignment.getCourseId())) {
                        throw new BadRequestException(String.format(
                                "Batch '%s' does not belong to the selected course.", b.getName()));
                    }
                    resolved.add(bId);
                }
            }
            return resolved;
        }
        if (batchIds != null) {
            return batchIds;
        }
        if (batchId != null) {
            return List.of(batchId);
        }
        return null;
    }

    private void validateTrainerAssignment(User trainer, Batch targetBatch) {
        if (!trainer.isActive()) {
            throw new BadRequestException(String.format(
                    "Cannot assign trainer '%s': trainer account is inactive.",
                    trainer.getName()
            ));
        }

        List<Batch> existingBatches = batchRepository.findByTrainerIdAndActiveTrue(trainer.getId());
        for (Batch existing : existingBatches) {
            if (existing.getId().equals(targetBatch.getId())) {
                continue;
            }

            if (ScheduleOverlapUtil.isScheduleOverlap(
                    targetBatch.getStartDate(), targetBatch.getEndDate(), targetBatch.getTiming(),
                    existing.getStartDate(), existing.getEndDate(), existing.getTiming())) {
                String existingTiming = (existing.getTiming() != null && !existing.getTiming().isBlank())
                        ? existing.getTiming()
                        : "full day";
                throw new ConflictException(String.format(
                        "Trainer is already assigned to batch '%s' which runs concurrently from %s to %s at %s. Batch timings must not overlap.",
                        existing.getName(),
                        existing.getStartDate(),
                        existing.getEndDate(),
                        existingTiming
                ));
            }
        }
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
