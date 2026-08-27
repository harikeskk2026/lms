package com.careerlabs.lms.api.batch.service.impl;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchService;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BatchServiceImpl implements BatchService {

    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final AssignmentRepository assignmentRepository;
    private final DailyClassRepository dailyClassRepository;

    public BatchServiceImpl(BatchRepository batchRepository,
                             CourseRepository courseRepository,
                             StudentRepository studentRepository,
                             AssignmentRepository assignmentRepository,
                             DailyClassRepository dailyClassRepository) {
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.assignmentRepository = assignmentRepository;
        this.dailyClassRepository = dailyClassRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> list() {
        return batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(BatchResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BatchResponse get(Long id) {
        return BatchResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public BatchResponse create(BatchRequest request) {
        Batch batch = new Batch();
        applyRequest(batch, request);

        return BatchResponse.from(batchRepository.save(batch));
    }

    @Override
    @Transactional
    public BatchResponse update(Long id, BatchRequest request) {
        Batch batch = findOrThrow(id);
        applyRequest(batch, request);

        return BatchResponse.from(batchRepository.save(batch));
    }

    @Override
    @Transactional
    public BatchResponse toggleActive(Long id) {
        Batch batch = findOrThrow(id);
        batch.setActive(!batch.isActive());

        return BatchResponse.from(batchRepository.save(batch));
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
