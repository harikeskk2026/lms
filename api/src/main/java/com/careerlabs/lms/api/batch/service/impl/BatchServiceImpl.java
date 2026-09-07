package com.careerlabs.lms.api.batch.service.impl;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchService;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.course.util.CourseDurationParser;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class BatchServiceImpl implements BatchService {

    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final AssignmentRepository assignmentRepository;
    private final DailyClassRepository dailyClassRepository;
    private final UserRepository userRepository;

    public BatchServiceImpl(BatchRepository batchRepository,
                             CourseRepository courseRepository,
                             StudentRepository studentRepository,
                             AssignmentRepository assignmentRepository,
                             DailyClassRepository dailyClassRepository,
                             UserRepository userRepository) {
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.assignmentRepository = assignmentRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list() {
        return list(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list(JwtUserPrincipal principal) {
        List<Batch> batches;
        if (principal != null && "TRAINER".equalsIgnoreCase(principal.role())) {
            batches = batchRepository.findByTrainerIdOrderByCreatedAtDesc(principal.id());
        } else {
            batches = batchRepository.findAllByOrderByCreatedAtDesc();
        }

        List<Long> batchIds = batches.stream().map(Batch::getId).toList();

        Map<Long, Long> countsByBatchId = batchIds.isEmpty() ? Map.of() : studentRepository.findByBatchIdIn(batchIds).stream()
                .collect(Collectors.groupingBy(s -> s.getBatch().getId(), Collectors.counting()));

        Set<Long> trainerIds = batches.stream()
                .map(Batch::getTrainerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, User> trainersById = trainerIds.isEmpty() ? Map.of() : userRepository.findAllById(trainerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return batches.stream()
                .map(b -> {
                    User tr = b.getTrainerId() != null ? trainersById.get(b.getTrainerId()) : null;
                    BatchResponse.TrainerSummary trainerSummary = tr != null
                            ? new BatchResponse.TrainerSummary(tr.getId(), tr.getName(), tr.getEmail())
                            : null;
                    return BatchResponse.from(b, countsByBatchId.getOrDefault(b.getId(), 0L).intValue(), trainerSummary);
                })
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
        if (principal != null && "TRAINER".equalsIgnoreCase(principal.role())) {
            if (batch.getTrainerId() == null || !batch.getTrainerId().equals(principal.id())) {
                throw new ForbiddenException("You are not assigned to this batch");
            }
        }
        User tr = batch.getTrainerId() != null ? userRepository.findById(batch.getTrainerId()).orElse(null) : null;
        BatchResponse.TrainerSummary trainerSummary = tr != null
                ? new BatchResponse.TrainerSummary(tr.getId(), tr.getName(), tr.getEmail())
                : null;
        return BatchResponse.from(batch, (int) studentRepository.countByBatchId(id), trainerSummary);
    }

    @Override
    @Transactional
    public BatchResponse create(BatchRequest request) {
        validateTrainerAvailability(null, request.getTrainerId(), request.getStartDate(), request.getEndDate(), request.getTiming());
        Batch batch = new Batch();
        applyRequest(batch, request);

        return BatchResponse.from(batchRepository.save(batch), 0);
    }

    @Override
    @Transactional
    public BatchResponse update(Long id, BatchRequest request) {
        Batch batch = findOrThrow(id);
        validateTrainerAvailability(id, request.getTrainerId(), request.getStartDate(), request.getEndDate(), request.getTiming());
        applyRequest(batch, request);

        Batch saved = batchRepository.save(batch);
        return BatchResponse.from(saved, (int) studentRepository.countByBatchId(id));
    }

    @Override
    @Transactional
    public BatchResponse toggleActive(Long id) {
        Batch batch = findOrThrow(id);
        if (!batch.isActive() && batch.getTrainerId() != null) {
            validateTrainerAvailability(id, batch.getTrainerId(), batch.getStartDate(), batch.getEndDate(), batch.getTiming());
        }
        batch.setActive(!batch.isActive());

        Batch saved = batchRepository.save(batch);
        return BatchResponse.from(saved, (int) studentRepository.countByBatchId(id));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Batch batch = findOrThrow(id);
        if (!studentRepository.findByBatchId(id).isEmpty()) {
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

        validateBatchDates(course, request.getStartDate(), request.getEndDate());

        batch.setName(request.getName());
        batch.setCourse(course);
        batch.setTrainerId(request.getTrainerId());
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

    private void validateTrainerAvailability(Long currentBatchId, Long trainerId, LocalDate startDate, LocalDate endDate, String timing) {
        if (trainerId == null) {
            return;
        }

        User trainer = userRepository.findById(trainerId)
                .filter(u -> u.getRole() == Role.TRAINER)
                .orElseThrow(() -> new ResourceNotFoundException("Trainer not found with ID: " + trainerId));

        boolean isExistingAssignment = false;
        if (currentBatchId != null) {
            Batch currentBatch = batchRepository.findById(currentBatchId).orElse(null);
            if (currentBatch != null && Objects.equals(currentBatch.getTrainerId(), trainerId)) {
                isExistingAssignment = true;
            }
        }

        if (!trainer.isActive() && !isExistingAssignment) {
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

            if (isDateOverlap(startDate, endDate, existing.getStartDate(), existing.getEndDate())) {
                if (isTimeOverlap(timing, existing.getTiming())) {
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
    }

    private boolean isDateOverlap(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return true;
        }
        return !start1.isAfter(end2) && !end1.isBefore(start2);
    }

    private boolean isTimeOverlap(String timing1, String timing2) {
        if (timing1 == null || timing1.isBlank() || timing2 == null || timing2.isBlank()) {
            return true;
        }
        if (timing1.trim().equalsIgnoreCase(timing2.trim())) {
            return true;
        }
        TimeRange range1 = parseTiming(timing1);
        TimeRange range2 = parseTiming(timing2);
        if (range1 == null || range2 == null) {
            return timing1.trim().equalsIgnoreCase(timing2.trim());
        }
        return range1.overlapsWith(range2);
    }

    private static final Pattern TIME_12H_PATTERN =
            Pattern.compile("(?i)^(\\d{1,2}):(\\d{2})\\s*(AM|PM)$");
    private static final Pattern TIME_24H_PATTERN =
            Pattern.compile("^(\\d{1,2}):(\\d{2})$");

    private Integer parseTimeToMinutes(String timeStr) {
        if (timeStr == null) return null;
        String s = timeStr.trim();
        Matcher m12 = TIME_12H_PATTERN.matcher(s);
        if (m12.matches()) {
            int hour = Integer.parseInt(m12.group(1));
            int minute = Integer.parseInt(m12.group(2));
            String ampm = m12.group(3).toUpperCase();
            if (hour == 12) {
                hour = ampm.equals("AM") ? 0 : 12;
            } else if (ampm.equals("PM")) {
                hour += 12;
            }
            return hour * 60 + minute;
        }
        Matcher m24 = TIME_24H_PATTERN.matcher(s);
        if (m24.matches()) {
            int hour = Integer.parseInt(m24.group(1));
            int minute = Integer.parseInt(m24.group(2));
            return hour * 60 + minute;
        }
        return null;
    }

    private TimeRange parseTiming(String timing) {
        if (timing == null || timing.isBlank()) return null;
        String[] parts = timing.split("-");
        if (parts.length != 2) return null;
        Integer start = parseTimeToMinutes(parts[0]);
        Integer end = parseTimeToMinutes(parts[1]);
        if (start == null || end == null || start >= end) return null;
        return new TimeRange(start, end);
    }

    private record TimeRange(int startMinutes, int endMinutes) {
        boolean overlapsWith(TimeRange other) {
            return this.startMinutes < other.endMinutes && this.endMinutes > other.startMinutes;
        }
    }
}
