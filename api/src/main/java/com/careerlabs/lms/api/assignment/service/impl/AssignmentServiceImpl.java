package com.careerlabs.lms.api.assignment.service.impl;

import com.careerlabs.lms.api.assignment.dto.request.AssignmentRequest;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentPageResponse;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.UploadResponse;
import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.assignment.service.AssignmentService;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AssignmentServiceImpl implements AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final FileStorageService fileStorageService;

    public AssignmentServiceImpl(AssignmentRepository assignmentRepository, CourseRepository courseRepository,
                                  BatchRepository batchRepository, FileStorageService fileStorageService) {
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentPageResponse list(String search, Long courseId, Long batchId, AssignmentStatus status,
                                        LocalDate dueDateFrom, LocalDate dueDateTo, int page, int limit) {
        int pageNumber = Math.max(page, 1);
        int pageSize = limit > 0 ? limit : 20;

        Pageable pageable = PageRequest.of(pageNumber - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Assignment> result = assignmentRepository.findAll(
                buildSpecification(search, courseId, batchId, status, dueDateFrom, dueDateTo), pageable);

        List<AssignmentResponse> assignments = result.getContent().stream()
                .map(AssignmentResponse::from)
                .toList();

        return new AssignmentPageResponse(assignments, result.getTotalElements(), pageNumber, result.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentResponse get(Long id) {
        return AssignmentResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public AssignmentResponse create(AssignmentRequest request) {
        Assignment assignment = new Assignment();
        applyRequest(assignment, request);
        if (request.getStatus() != null) {
            assignment.setStatus(request.getStatus());
        }

        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    @Override
    @Transactional
    public AssignmentResponse update(Long id, AssignmentRequest request) {
        Assignment assignment = findOrThrow(id);
        applyRequest(assignment, request);
        if (request.getStatus() != null) {
            assignment.setStatus(request.getStatus());
        }

        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Assignment assignment = findOrThrow(id);
        assignmentRepository.delete(assignment);
    }

    @Override
    @Transactional
    public AssignmentResponse publish(Long id) {
        Assignment assignment = findOrThrow(id);
        assignment.setStatus(AssignmentStatus.PUBLISHED);
        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    @Override
    @Transactional
    public AssignmentResponse close(Long id) {
        Assignment assignment = findOrThrow(id);
        assignment.setStatus(AssignmentStatus.CLOSED);
        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    @Override
    public UploadResponse uploadAttachment(MultipartFile file) {
        StoredFile stored = fileStorageService.store(file, "assignments");
        return new UploadResponse(stored.url(), stored.originalName());
    }

    private Assignment findOrThrow(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + id));
    }

    private void applyRequest(Assignment assignment, AssignmentRequest request) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));
        Batch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + request.getBatchId()));

        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setCourse(course);
        assignment.setBatch(batch);
        assignment.setStartDate(request.getStartDate());
        assignment.setDueDate(request.getDueDate());
        assignment.setTotalMarks(request.getTotalMarks());
        assignment.setAttachmentUrl(request.getAttachmentUrl());
        assignment.setAttachmentName(request.getAttachmentName());
    }

    private Specification<Assignment> buildSpecification(String search, Long courseId, Long batchId,
                                                           AssignmentStatus status, LocalDate dueDateFrom,
                                                           LocalDate dueDateTo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.like(cb.lower(root.get("title")), pattern));
            }
            if (courseId != null) {
                predicates.add(cb.equal(root.get("course").get("id"), courseId));
            }
            if (batchId != null) {
                predicates.add(cb.equal(root.get("batch").get("id"), batchId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (dueDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), dueDateFrom));
            }
            if (dueDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), dueDateTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
