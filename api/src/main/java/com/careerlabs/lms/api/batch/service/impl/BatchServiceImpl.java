package com.careerlabs.lms.api.batch.service.impl;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchService;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
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
        Batch batch = new Batch();
        applyRequest(batch, request);

        return BatchResponse.from(batchRepository.save(batch), 0);
    }

    @Override
    @Transactional
    public BatchResponse update(Long id, BatchRequest request) {
        Batch batch = findOrThrow(id);
        applyRequest(batch, request);

        Batch saved = batchRepository.save(batch);
        return BatchResponse.from(saved, (int) studentRepository.countByBatchId(id));
    }

    @Override
    @Transactional
    public BatchResponse toggleActive(Long id) {
        Batch batch = findOrThrow(id);
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
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

        batch.setName(request.getName());
        batch.setCourse(course);
        batch.setTrainerId(request.getTrainerId());
        batch.setStartDate(request.getStartDate());
        batch.setEndDate(request.getEndDate());
        batch.setTiming(request.getTiming());
        batch.setMode(request.getMode());
        batch.setMaxStudents(request.getMaxStudents());
    }
}
