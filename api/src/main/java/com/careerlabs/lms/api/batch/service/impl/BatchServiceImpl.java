package com.careerlabs.lms.api.batch.service.impl;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchService;
import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.common.dto.response.ImportRowError;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.util.CsvParser;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.common.util.ScheduleOverlapUtil;
import com.careerlabs.lms.api.course.util.CourseDurationParser;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BatchServiceImpl implements BatchService {

    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final AssignmentRepository assignmentRepository;
    private final DailyClassRepository dailyClassRepository;
    private final UserRepository userRepository;
    private final CourseAccessGuard accessGuard;
    private final EnrollmentRepository enrollmentRepository;
    private final TransactionTemplate transactionTemplate;

    public BatchServiceImpl(BatchRepository batchRepository,
                             CourseRepository courseRepository,
                             StudentRepository studentRepository,
                             AssignmentRepository assignmentRepository,
                             DailyClassRepository dailyClassRepository,
                             UserRepository userRepository,
                             CourseAccessGuard accessGuard,
                             EnrollmentRepository enrollmentRepository,
                             PlatformTransactionManager transactionManager) {
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.assignmentRepository = assignmentRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.userRepository = userRepository;
        this.accessGuard = accessGuard;
        this.enrollmentRepository = enrollmentRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list() {
        return list(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list(JwtUserPrincipal principal) {
        return list(principal, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list(JwtUserPrincipal principal, String search) {
        return list(principal, search, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list(JwtUserPrincipal principal, String search, String mode) {
        List<Batch> batches;
        if (principal != null && "TRAINER".equalsIgnoreCase(principal.role())) {
            batches = batchRepository.findPublishedByTrainerIdOrderByCreatedAtDesc(principal.id());
        } else if (principal != null && "STUDENT".equalsIgnoreCase(principal.role())) {
            Student student = studentRepository.findByUserId(principal.id()).orElse(null);
            if (student != null) {
                batches = enrollmentRepository.findActiveBatchesByStudentId(student.getId()).stream()
                        .filter(b -> b.getCourse() != null && accessGuard.isReadableCourseStatus(b.getCourse().getStatus()))
                        .toList();
            } else {
                batches = List.of();
            }
        } else {
            batches = batchRepository.findAllByOrderByCreatedAtDesc();
        }

        if (mode != null && !mode.isBlank()) {
            BatchMode batchMode;
            try {
                batchMode = BatchMode.valueOf(mode.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid mode '" + mode + "'. Allowed values: ONLINE, OFFLINE");
            }
            BatchMode normalized = batchMode;
            batches = batches.stream()
                    .filter(b -> normalized == b.getMode())
                    .toList();
        }

        List<Long> batchIds = batches.stream().map(Batch::getId).toList();

        Map<Long, Long> countsByBatchId = batchIds.isEmpty() ? Map.of() : enrollmentRepository.findByBatchIdInAndActiveTrue(batchIds).stream()
                .filter(e -> e.getBatch() != null)
                .collect(Collectors.groupingBy(e -> e.getBatch().getId(), Collectors.counting()));

        List<BatchResponse> responses = batches.stream()
                .map(b -> BatchResponse.from(b, countsByBatchId.getOrDefault(b.getId(), 0L).intValue(), toTrainerSummaries(b)))
                .toList();

        String normalized = search == null ? null : search.trim();
        if (normalized == null || normalized.isEmpty()) {
            return responses;
        }
        String needle = normalized.toLowerCase(Locale.ROOT);
        return responses.stream()
                .filter(r -> containsIgnoreCase(r.name(), needle)
                        || (r.course() != null && containsIgnoreCase(r.course().title(), needle)))
                .toList();
    }

    private boolean containsIgnoreCase(String value, String lowerCaseNeedle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(lowerCaseNeedle);
    }

    private List<BatchResponse.TrainerSummary> toTrainerSummaries(Batch batch) {
        return batch.getTrainers().stream()
                .map(t -> new BatchResponse.TrainerSummary(t.getId(), t.getName(), t.getEmail(), t.isActive()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BatchResponse get(Long id) {
        return get(id, null);
    }

    @Override
    @Transactional(readOnly = true)
    public BatchResponse get(Long id, JwtUserPrincipal principal) {
        Batch batch = findOrThrow(id);
        if (principal != null) {
            if ("TRAINER".equalsIgnoreCase(principal.role())) {
                boolean assigned = batch.hasTrainer(principal.id());
                boolean readable = batch.getCourse() != null
                        && accessGuard.isReadableCourseStatus(batch.getCourse().getStatus());
                if (!assigned || !readable) {
                    throw new ForbiddenException("You are not assigned to any published batch for this course");
                }
            } else if ("STUDENT".equalsIgnoreCase(principal.role())) {
                Student student = studentRepository.findByUserId(principal.id()).orElse(null);
                boolean inBatch = student != null && enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(student.getId(), batch.getId());
                boolean readable = batch.getCourse() != null
                        && accessGuard.isReadableCourseStatus(batch.getCourse().getStatus());
                if (!inBatch || !readable) {
                    throw new ForbiddenException("You are not enrolled in this batch");
                }
            }
        }
        return BatchResponse.from(batch, (int) enrollmentRepository.countByBatchIdAndActiveTrue(id), toTrainerSummaries(batch));
    }

    @Override
    @Transactional
    public BatchResponse create(BatchRequest request) {
        validateTrainerAvailability(null, request.getTrainerIds(), request.getStartDate(), request.getEndDate(), request.getTiming());
        Batch batch = new Batch();
        applyRequest(batch, request);

        Batch saved = batchRepository.save(batch);
        return BatchResponse.from(saved, 0, toTrainerSummaries(saved));
    }

    @Override
    public BulkImportResponse<BatchResponse> bulkImportBatches(MultipartFile file) {
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
            throw new BadRequestException("CSV file contains no batch data rows");
        }
        if (rows.size() > 1000) {
            throw new BadRequestException("CSV file exceeds maximum limit of 1000 rows");
        }

        boolean hasNameHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("name"));
        if (!hasNameHeader) {
            throw new BadRequestException("CSV file must contain a 'Name' column");
        }

        List<BatchResponse> importedBatches = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();

        for (CsvParser.ParsedRow row : rows) {
            int rowNum = row.getRowNumber();

            String name = row.get("name", "batchname", "batch_name", "title");
            if (name == null || name.trim().isEmpty()) {
                errors.add(new ImportRowError(rowNum, "", "Batch name is required"));
                continue;
            }
            name = name.trim();

            String courseVal = row.get("course", "coursetitle", "coursename", "courseid", "course_code");
            if (courseVal == null || courseVal.isBlank()) {
                errors.add(new ImportRowError(rowNum, name, "Course is required (match by title or ID)"));
                continue;
            }
            Course course = resolveBatchCourse(courseVal.trim());
            if (course == null) {
                errors.add(new ImportRowError(rowNum, name, "Course '" + courseVal + "' not found. Provide an existing course title or ID"));
                continue;
            }

            String rawStart = row.get("startdate", "start_date", "batchstartdate");
            LocalDate startDate = null;
            if (rawStart == null || rawStart.isBlank()) {
                errors.add(new ImportRowError(rowNum, name, "Start Date is required (format YYYY-MM-DD)"));
                continue;
            }
            try {
                startDate = LocalDate.parse(rawStart.trim());
            } catch (DateTimeParseException e) {
                errors.add(new ImportRowError(rowNum, name, "Invalid Start Date '" + rawStart + "'. Use YYYY-MM-DD format"));
                continue;
            }

            String rawEnd = row.get("enddate", "end_date", "batchenddate");
            LocalDate endDate = null;
            if (rawEnd == null || rawEnd.isBlank()) {
                errors.add(new ImportRowError(rowNum, name, "End Date is required (format YYYY-MM-DD)"));
                continue;
            }
            try {
                endDate = LocalDate.parse(rawEnd.trim());
            } catch (DateTimeParseException e) {
                errors.add(new ImportRowError(rowNum, name, "Invalid End Date '" + rawEnd + "'. Use YYYY-MM-DD format"));
                continue;
            }
            if (endDate.isBefore(startDate)) {
                errors.add(new ImportRowError(rowNum, name, "End Date cannot be before Start Date"));
                continue;
            }

            String timing = row.get("timing", "schedule", "batchtiming");
            String rawMode = row.get("mode", "deliverymode", "batchmode");
            BatchMode mode;
            if (rawMode == null || rawMode.isBlank()) {
                mode = BatchMode.ONLINE;
            } else {
                try {
                    mode = BatchMode.valueOf(rawMode.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException e) {
                    errors.add(new ImportRowError(rowNum, name, "Invalid mode '" + rawMode + "'. Allowed: ONLINE, OFFLINE"));
                    continue;
                }
            }

            String rawMax = row.get("maxstudents", "max_students", "capacity", "seats", "maxstudentsperbatch");
            int maxStudents = 30;
            if (rawMax != null && !rawMax.isBlank()) {
                try {
                    maxStudents = Integer.parseInt(rawMax.trim());
                } catch (NumberFormatException e) {
                    errors.add(new ImportRowError(rowNum, name, "Max Students must be a number"));
                    continue;
                }
                if (maxStudents < 1 || maxStudents > 500) {
                    errors.add(new ImportRowError(rowNum, name, "Max Students must be between 1 and 500"));
                    continue;
                }
            }

            String trainerEmailsRaw = row.get("traineremails", "trainers", "trainer_email", "traineremail");
            List<Long> trainerIds = new ArrayList<>();
            if (trainerEmailsRaw != null && !trainerEmailsRaw.isBlank()) {
                boolean ok = true;
                Set<String> seenTrainers = new LinkedHashSet<>();
                for (String rawEmail : trainerEmailsRaw.split("[;,]")) {
                    String trainerEmail = rawEmail.trim();
                    if (trainerEmail.isEmpty()) {
                        continue;
                    }
                    if (!seenTrainers.add(trainerEmail.toLowerCase(Locale.ROOT))) {
                        continue;
                    }
                    User trainer = userRepository.findByEmailIgnoreCase(trainerEmail)
                            .filter(u -> u.getRole() == Role.TRAINER)
                            .orElse(null);
                    if (trainer == null) {
                        errors.add(new ImportRowError(rowNum, name, "Trainer email '" + trainerEmail + "' not found"));
                        ok = false;
                        break;
                    }
                    trainerIds.add(trainer.getId());
                }
                if (!ok) {
                    continue;
                }
            }

            final String fName = name;
            final Long fCourseId = course.getId();
            final List<Long> fTrainerIds = trainerIds;
            final LocalDate fStartDate = startDate;
            final LocalDate fEndDate = endDate;
            final String fTiming = timing;
            final BatchMode fMode = mode;
            final int fMaxStudents = maxStudents;

            try {
                BatchResponse created = transactionTemplate.execute(status -> {
                    BatchRequest request = new BatchRequest();
                    request.setName(fName);
                    request.setCourseId(fCourseId);
                    request.setTrainerIds(fTrainerIds);
                    request.setStartDate(fStartDate);
                    request.setEndDate(fEndDate);
                    request.setTiming(fTiming);
                    request.setMode(fMode);
                    request.setMaxStudents(fMaxStudents);
                    return create(request);
                });
                if (created != null) {
                    importedBatches.add(created);
                }
            } catch (Exception ex) {
                errors.add(new ImportRowError(rowNum, fName, "Failed to create batch: " + ex.getMessage()));
            }
        }

        return new BulkImportResponse<>(rows.size(), importedBatches.size(), errors.size(), importedBatches, errors);
    }

    private Course resolveBatchCourse(String val) {
        if (val != null && val.matches("^\\d+$")) {
            try {
                Long id = Long.parseLong(val);
                Course byId = courseRepository.findById(id).orElse(null);
                if (byId != null) {
                    return byId;
                }
            } catch (NumberFormatException ignored) {
            }
        }
        Course byTitle = courseRepository.findByTitleIgnoreCase(val).orElse(null);
        if (byTitle != null) {
            return byTitle;
        }
        for (Course c : courseRepository.findAllByOrderByCreatedAtDesc()) {
            if (c.getCourseCode() != null && c.getCourseCode().equalsIgnoreCase(val)) {
                return c;
            }
        }
        return null;
    }

    @Override
    @Transactional
    public BatchResponse update(Long id, BatchRequest request) {
        Batch batch = findOrThrow(id);
        validateTrainerAvailability(id, request.getTrainerIds(), request.getStartDate(), request.getEndDate(), request.getTiming());
        applyRequest(batch, request);

        Batch saved = batchRepository.save(batch);
        return BatchResponse.from(saved, (int) enrollmentRepository.countByBatchIdAndActiveTrue(id), toTrainerSummaries(saved));
    }

    @Override
    @Transactional
    public BatchResponse toggleActive(Long id) {
        Batch batch = findOrThrow(id);
        if (!batch.isActive() && !batch.getTrainers().isEmpty()) {
            List<Long> trainerIds = batch.getTrainers().stream().map(User::getId).toList();
            validateTrainerAvailability(id, trainerIds, batch.getStartDate(), batch.getEndDate(), batch.getTiming());
        }
        batch.setActive(!batch.isActive());

        Batch saved = batchRepository.save(batch);
        return BatchResponse.from(saved, (int) enrollmentRepository.countByBatchIdAndActiveTrue(id), toTrainerSummaries(saved));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Batch batch = findOrThrow(id);
        if (enrollmentRepository.countByBatchIdAndActiveTrue(id) > 0) {
            throw new ConflictException("Cannot delete batch '" + batch.getName() + "': it has enrolled students. Reassign or remove them first.");
        }
        if (!assignmentRepository.findByBatchId(id).isEmpty()) {
            throw new ConflictException("Cannot delete batch '" + batch.getName() + "': it has assignments. Remove them first.");
        }
        if (!dailyClassRepository.findByBatchIdOrderByDateDesc(id).isEmpty()) {
            throw new ConflictException("Cannot delete batch '" + batch.getName() + "': it has scheduled classes. Remove them first.");
        }
        batchRepository.delete(batch);
    }

    private Batch findOrThrow(Long id) {
        return batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + id));
    }

    private void applyRequest(Batch batch, BatchRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date cannot be before start date");
        }

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new BadRequestException(
                    String.format("Cannot create or assign batch to course '%s' because it is not PUBLISHED (current status: %s). DRAFT courses are still being prepared and ARCHIVED courses are retired from new use.", course.getTitle(), course.getStatus()));
        }

        validateBatchDates(course, request.getStartDate(), request.getEndDate());

        batch.setName(request.getName());
        batch.setCourse(course);
        batch.setTrainers(resolveTrainers(request.getTrainerIds()));
        batch.setStartDate(request.getStartDate());
        batch.setEndDate(request.getEndDate());
        batch.setTiming(request.getTiming());
        batch.setMode(request.getMode());
        batch.setMaxStudents(request.getMaxStudents());
    }

    private void validateBatchDates(Course course, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return;
        }
        if (startDate.isAfter(endDate)) {
            throw new BadRequestException("Batch start date must be before or equal to end date.");
        }
        String duration = course.getDuration();
        LocalDate maxEndDate = CourseDurationParser.calculateMaxEndDate(startDate, duration);
        if (maxEndDate != null && endDate.isAfter(maxEndDate)) {
            throw new BadRequestException(
                    "Batch duration cannot exceed the selected course duration of " + duration + ".");
        }
    }

    /**
     * A batch can now have several trainers, so each one is validated
     * independently: co-teaching the same batch is fine (they share this
     * batch's own schedule), but every trainer's OTHER active batches still
     * must not overlap with it.
     */
    private void validateTrainerAvailability(Long currentBatchId, List<Long> trainerIds, LocalDate startDate, LocalDate endDate, String timing) {
        if (trainerIds == null || trainerIds.isEmpty()) {
            return;
        }
        for (Long trainerId : new HashSet<>(trainerIds)) {
            validateSingleTrainerAvailability(currentBatchId, trainerId, startDate, endDate, timing);
        }
    }

    private void validateSingleTrainerAvailability(Long currentBatchId, Long trainerId, LocalDate startDate, LocalDate endDate, String timing) {
        User trainer = userRepository.findById(trainerId)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + trainerId));

        if (!trainer.isActive()) {
            throw new BadRequestException(String.format(
                    "Cannot assign trainer '%s': trainer account is inactive.",
                    trainer.getName()
            ));
        }

        List<Batch> existingBatches = batchRepository.findByTrainerIdAndActiveTrue(trainerId);
        for (Batch existing : existingBatches) {
            if (currentBatchId != null && currentBatchId.equals(existing.getId())) {
                continue;
            }

            if (ScheduleOverlapUtil.isDateOverlap(startDate, endDate, existing.getStartDate(), existing.getEndDate())) {
                if (ScheduleOverlapUtil.isTimeOverlap(timing, existing.getTiming())) {
                    String existingTiming = (existing.getTiming() != null && !existing.getTiming().isBlank())
                            ? existing.getTiming()
                            : "full day";
                    throw new ConflictException(String.format(
                            "Trainer '%s' is already assigned to batch '%s' which runs concurrently from %s to %s at %s. Batch timings must not overlap.",
                            trainer.getName(),
                            existing.getName(),
                            existing.getStartDate(),
                            existing.getEndDate(),
                            existingTiming
                    ));
                }
            }
        }
    }

    private Set<User> resolveTrainers(List<Long> trainerIds) {
        if (trainerIds == null || trainerIds.isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(userRepository.findAllById(new HashSet<>(trainerIds)));
    }
}
