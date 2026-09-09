package com.careerlabs.lms.api.assignment.service.impl;

import com.careerlabs.lms.api.assignment.dto.request.AssignmentRequest;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentPageResponse;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.StudentAssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.UploadResponse;
import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.assignment.service.AssignmentService;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AssignmentServiceImpl implements AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final FileStorageService fileStorageService;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final NotificationService notificationService;

    public AssignmentServiceImpl(AssignmentRepository assignmentRepository, CourseRepository courseRepository,
                                  BatchRepository batchRepository, FileStorageService fileStorageService,
                                  StudentRepository studentRepository,
                                  EnrollmentRepository enrollmentRepository,
                                  AssignmentSubmissionRepository submissionRepository,
                                  NotificationService notificationService) {
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.fileStorageService = fileStorageService;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
        this.notificationService = notificationService;
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
    @Transactional(readOnly = true)
    public List<StudentAssignmentResponse> listForStudent(Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        Set<Long> batchIds = new LinkedHashSet<>();
        if (student.getBatch() != null) {
            batchIds.add(student.getBatch().getId());
        }

        List<Enrollment> enrollments = enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
        for (Enrollment e : enrollments) {
            if (e.getBatch() != null) {
                batchIds.add(e.getBatch().getId());
            }
        }

        if (batchIds.isEmpty()) {
            return List.of();
        }

        List<Assignment> assignments = assignmentRepository.findByBatchIdInAndStatusInOrderByDueDateAsc(
                new ArrayList<>(batchIds), List.of(AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED));

        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        Map<Long, AssignmentSubmission> submissionsByAssignmentId = assignmentIds.isEmpty()
                ? Map.of()
                : submissionRepository.findByAssignmentIdInAndStudentId(assignmentIds, student.getId()).stream()
                        .collect(Collectors.toMap(s -> s.getAssignment().getId(), s -> s));

        return assignments.stream()
                .map(assignment -> toStudentResponse(assignment, submissionsByAssignmentId.get(assignment.getId())))
                .toList();
    }

    private StudentAssignmentResponse toStudentResponse(Assignment assignment, AssignmentSubmission submissionEntity) {
        Optional<AssignmentSubmission> submission = Optional.ofNullable(submissionEntity);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime closeDateTime = assignment.getDueDate() != null
                ? (assignment.getCloseTime() != null ? LocalDateTime.of(assignment.getDueDate(), assignment.getCloseTime()) : assignment.getDueDate().atTime(23, 59, 59))
                : null;
        boolean isOverdue = submission.isEmpty() && closeDateTime != null && now.isAfter(closeDateTime);

        StudentAssignmentResponse.SubmissionInfo submissionInfo = submission.map(s -> {
            String status = s.isReviewed() ? "GRADED" : s.isLate() ? "LATE" : "SUBMITTED";
            return new StudentAssignmentResponse.SubmissionInfo(
                    s.getId(), status, s.getMarks(), s.getFeedback(), s.getFileUrl(), s.getNotes(),
                    s.getSubmittedAt(), s.isReviewed() ? s.getUpdatedAt() : null);
        }).orElse(null);

        return new StudentAssignmentResponse(
                assignment.getId(), assignment.getTitle(), assignment.getDescription(),
                assignment.getBatch().getName(), assignment.getStartDate(), assignment.getPublishTime(),
                assignment.getDueDate(), assignment.getCloseTime(), assignment.getTotalMarks(),
                assignment.getAttachmentUrl(), assignment.getAttachmentName(), isOverdue, submissionInfo);
    }

    @Override
    @Transactional
    public AssignmentResponse create(AssignmentRequest request) {
        Assignment assignment = new Assignment();
        applyRequest(assignment, request);
        if (request.getStatus() != null) {
            assignment.setStatus(request.getStatus());
        }

        Assignment saved = assignmentRepository.save(assignment);

        // Notify batch students immediately if published on creation
        if (saved.getStatus() == AssignmentStatus.PUBLISHED) {
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "📋 New Assignment: " + saved.getTitle(),
                    "Due on " + saved.getDueDate() + ". Submit before the deadline.",
                    NotificationType.INFO,
                    "/student/assignments"
            );
        }

        return AssignmentResponse.from(saved);
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
        Assignment saved = assignmentRepository.save(assignment);

        // Notify all students in the batch that a new assignment is live
        notificationService.notifyBatch(
                saved.getBatch().getId(),
                "📋 New Assignment: " + saved.getTitle(),
                "Due on " + saved.getDueDate() + ". Submit before the deadline.",
                NotificationType.INFO,
                "/student/assignments"
        );

        return AssignmentResponse.from(saved);
    }

    @Override
    @Transactional
    public AssignmentResponse close(Long id) {
        Assignment assignment = findOrThrow(id);
        assignment.setStatus(AssignmentStatus.CLOSED);
        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    @Override
    @Transactional
    public AssignmentResponse reopen(Long id) {
        Assignment assignment = findOrThrow(id);
        assignment.setStatus(AssignmentStatus.PUBLISHED);
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
        if (request.getTotalMarks() == null || request.getTotalMarks() < 1 || request.getTotalMarks() > 100) {
            throw new BadRequestException("Please enter correct value below 100");
        }

        if (request.getStartDate() != null && request.getDueDate() != null) {
            LocalDateTime startDateTime = request.getPublishTime() != null
                    ? LocalDateTime.of(request.getStartDate(), request.getPublishTime())
                    : request.getStartDate().atStartOfDay();
            LocalDateTime dueDateTime = request.getCloseTime() != null
                    ? LocalDateTime.of(request.getDueDate(), request.getCloseTime())
                    : request.getDueDate().atTime(23, 59, 59);

            if (dueDateTime.isBefore(startDateTime)) {
                throw new BadRequestException("Due date & close time must be after publish date & time");
            }
        }

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));
        Batch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + request.getBatchId()));

        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setCourse(course);
        assignment.setBatch(batch);
        assignment.setStartDate(request.getStartDate());
        assignment.setPublishTime(request.getPublishTime());
        assignment.setDueDate(request.getDueDate());
        assignment.setCloseTime(request.getCloseTime());
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
