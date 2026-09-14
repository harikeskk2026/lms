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
import com.careerlabs.lms.api.submission.dto.response.SubmissionAttachmentResponse;
import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
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
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AssignmentServiceImpl implements AssignmentService {

    private static final Set<String> ALLOWED_ASSIGNMENT_EXTENSIONS = Set.of("pdf", "docx", "doc");

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final FileStorageService fileStorageService;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public AssignmentServiceImpl(AssignmentRepository assignmentRepository, CourseRepository courseRepository,
            BatchRepository batchRepository, FileStorageService fileStorageService,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            AssignmentSubmissionRepository submissionRepository,
            NotificationService notificationService,
            UserRepository userRepository) {
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.fileStorageService = fileStorageService;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
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

        List<Long> ids = result.getContent().stream().map(Assignment::getId).toList();
        Map<Long, Long> countsByAssignmentId = ids.isEmpty() ? Map.of()
                : submissionRepository.findByAssignmentIdIn(ids).stream()
                        .collect(Collectors.groupingBy(s -> s.getAssignment().getId(), Collectors.counting()));

        List<AssignmentResponse> assignments = result.getContent().stream()
                .map(a -> AssignmentResponse.from(a, countsByAssignmentId.getOrDefault(a.getId(), 0L).intValue()))
                .toList();

        return new AssignmentPageResponse(assignments, result.getTotalElements(), pageNumber, result.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentResponse get(Long id) {
        Assignment assignment = findOrThrow(id);
        int submissionCount = submissionRepository.findByAssignmentId(id).size();
        return AssignmentResponse.from(assignment, submissionCount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentAssignmentResponse> listForStudent(Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        List<Enrollment> enrollments = enrollmentRepository
                .findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
        Set<Long> batchIds = enrollments.stream()
                .map(Enrollment::getBatch)
                .filter(java.util.Objects::nonNull)
                .map(Batch::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (batchIds.isEmpty()) {
            return List.of();
        }

        List<Assignment> assignments = assignmentRepository.findByBatchIdInAndStatusInOrderByDueDateAsc(
                new ArrayList<>(batchIds), List.of(AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED))
                .stream()
                .filter(a -> {
                    // Do not show PUBLISHED assignments whose publish date+time is still in the future
                    if (a.getStatus() == AssignmentStatus.PUBLISHED && a.getStartDate() != null) {
                        LocalDateTime publishDateTime = a.getPublishTime() != null
                                ? LocalDateTime.of(a.getStartDate(), a.getPublishTime())
                                : a.getStartDate().atStartOfDay();
                        return !LocalDateTime.now().isBefore(publishDateTime);
                    }
                    return true;
                })
                .toList();

        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        Map<Long, AssignmentSubmission> submissionsByAssignmentId = assignmentIds.isEmpty()
                ? Map.of()
                : submissionRepository.findByAssignmentIdInAndStudentId(assignmentIds, student.getId()).stream()
                        .collect(Collectors.toMap(s -> s.getAssignment().getId(), s -> s));

        Set<Long> trainerIds = assignments.stream()
                .map(a -> a.getBatch() != null ? a.getBatch().getTrainerId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> trainerNamesById = trainerIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(trainerIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getName));

        return assignments.stream()
                .map(assignment -> {
                    String trainerName = (assignment.getBatch() != null && assignment.getBatch().getTrainerId() != null)
                            ? trainerNamesById.get(assignment.getBatch().getTrainerId())
                            : null;
                    return toStudentResponse(assignment, submissionsByAssignmentId.get(assignment.getId()), trainerName);
                })
                .toList();
    }

    private StudentAssignmentResponse toStudentResponse(Assignment assignment, AssignmentSubmission submissionEntity, String trainerName) {
        Optional<AssignmentSubmission> submission = Optional.ofNullable(submissionEntity);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime closeDateTime = assignment.getDueDate() != null
                ? (assignment.getCloseTime() != null
                        ? LocalDateTime.of(assignment.getDueDate(), assignment.getCloseTime())
                        : assignment.getDueDate().atTime(23, 59, 59))
                : null;
        boolean isOverdue = submission.isEmpty() && closeDateTime != null && now.isAfter(closeDateTime);

        StudentAssignmentResponse.SubmissionInfo submissionInfo = submission.map(s -> {
            String status = s.isReviewed() ? "GRADED"
                    : (s.getStatus() != null ? s.getStatus().name() : (s.isLate() ? "LATE" : "SUBMITTED"));
            List<SubmissionAttachmentResponse> files = s.getAttachments() != null && !s.getAttachments().isEmpty()
                    ? s.getAttachments().stream()
                            .map(a -> new SubmissionAttachmentResponse(a.getFileUrl(), a.getFileName())).toList()
                    : (s.getFileUrl() != null
                            ? List.of(new SubmissionAttachmentResponse(s.getFileUrl(), s.getFileName()))
                            : List.of());
            return new StudentAssignmentResponse.SubmissionInfo(
                    s.getId(), status, s.getMarks(), s.getFeedback(), s.getFileUrl(), s.getFileName(), s.getNotes(),
                    s.getSubmittedAt(), s.isReviewed() ? s.getUpdatedAt() : null, files, s.getRejectionReason());
        }).orElse(null);

        return new StudentAssignmentResponse(
                assignment.getId(), assignment.getTitle(), assignment.getDescription(),
                assignment.getBatch().getName(), trainerName, assignment.getStartDate(), assignment.getPublishTime(),
                assignment.getDueDate(), assignment.getCloseTime(), assignment.getTotalMarks(),
                assignment.getAttachmentUrl(), assignment.getAttachmentName(), isOverdue,
                assignment.getStatus(), submissionInfo);
    }

    @Override
    @Transactional
    public AssignmentResponse create(AssignmentRequest request) {
        Assignment assignment = new Assignment();
        applyRequest(assignment, request);
        if (request.getStatus() != null) {
            // If admin explicitly wants to publish but startDate is in the future,
            // mark as SCHEDULED — the scheduler will auto-publish at the right time.
            if (request.getStatus() == AssignmentStatus.PUBLISHED && isPublishDateInFuture(assignment)) {
                assignment.setStatus(AssignmentStatus.SCHEDULED);
            } else if (request.getStatus() == AssignmentStatus.SCHEDULED && !isPublishDateInFuture(assignment)) {
                assignment.setStatus(AssignmentStatus.PUBLISHED);
            } else {
                assignment.setStatus(request.getStatus());
            }
        }

        Assignment saved = assignmentRepository.save(assignment);

        if (saved.getStatus() == AssignmentStatus.SCHEDULED) {
            // Notify students that an assignment has been scheduled ahead of time
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "Assignment Scheduled: " + saved.getTitle(),
                    "This assignment will be available on " + formatPublishDateTime(saved)
                            + ". Due on " + formatDueDate(saved.getDueDate()) + ".",
                    NotificationType.INFO,
                    "/student/assignments");
        } else if (saved.getStatus() == AssignmentStatus.PUBLISHED) {
            // Notify students immediately if published right now
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "New Assignment: " + saved.getTitle(),
                    "Due on " + formatDueDate(saved.getDueDate()) + ". Submit before the deadline.",
                    NotificationType.INFO,
                    "/student/assignments");
        }

        return AssignmentResponse.from(saved);
    }

    @Override
    @Transactional
    public AssignmentResponse update(Long id, AssignmentRequest request) {
        Assignment assignment = findOrThrow(id);
        AssignmentStatus previousStatus = assignment.getStatus();
        applyRequest(assignment, request);
        if (request.getStatus() != null) {
            // Re-evaluate PUBLISHED/SCHEDULED assignments when dates change:
            // if startDate is now in the future → SCHEDULED; if past/now → PUBLISHED.
            if ((request.getStatus() == AssignmentStatus.PUBLISHED ||
                    request.getStatus() == AssignmentStatus.SCHEDULED) &&
                    isPublishDateInFuture(assignment)) {
                assignment.setStatus(AssignmentStatus.SCHEDULED);
            } else if (request.getStatus() == AssignmentStatus.SCHEDULED &&
                    !isPublishDateInFuture(assignment)) {
                // Start date has now passed — promote to PUBLISHED
                assignment.setStatus(AssignmentStatus.PUBLISHED);
            } else {
                assignment.setStatus(request.getStatus());
            }
        }

        Assignment saved = assignmentRepository.save(assignment);

        if (previousStatus != AssignmentStatus.SCHEDULED && saved.getStatus() == AssignmentStatus.SCHEDULED) {
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "Assignment Scheduled: " + saved.getTitle(),
                    "This assignment will be available on " + formatPublishDateTime(saved)
                            + ". Due on " + formatDueDate(saved.getDueDate()) + ".",
                    NotificationType.INFO,
                    "/student/assignments");
        } else if (previousStatus != AssignmentStatus.PUBLISHED && saved.getStatus() == AssignmentStatus.PUBLISHED) {
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "New Assignment: " + saved.getTitle(),
                    "Due on " + formatDueDate(saved.getDueDate()) + ". Submit before the deadline.",
                    NotificationType.INFO,
                    "/student/assignments");
        } else if (previousStatus != AssignmentStatus.CLOSED && saved.getStatus() == AssignmentStatus.CLOSED) {
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "Assignment Closed: " + saved.getTitle(),
                    "This assignment is now closed. Submissions are no longer accepted.",
                    NotificationType.INFO,
                    "/student/assignments");
        }

        return AssignmentResponse.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Assignment assignment = findOrThrow(id);
        List<AssignmentSubmission> submissions = submissionRepository.findByAssignmentId(id);
        if (submissions != null && !submissions.isEmpty()) {
            submissionRepository.deleteAll(submissions);
        }
        assignmentRepository.delete(assignment);
    }

    @Override
    @Transactional
    public AssignmentResponse publish(Long id) {
        Assignment assignment = findOrThrow(id);

        // If the publish/start date is still in the future, mark as SCHEDULED.
        // The scheduler (AssignmentSchedulerService) will auto-publish at the right time.
        if (isPublishDateInFuture(assignment)) {
            assignment.setStatus(AssignmentStatus.SCHEDULED);
            Assignment saved = assignmentRepository.save(assignment);

            // Notify students that the assignment is scheduled
            notificationService.notifyBatch(
                    saved.getBatch().getId(),
                    "Assignment Scheduled: " + saved.getTitle(),
                    "This assignment will be available on " + formatPublishDateTime(saved)
                            + ". Due on " + formatDueDate(saved.getDueDate()) + ".",
                    NotificationType.INFO,
                    "/student/assignments");

            return AssignmentResponse.from(saved);
        }

        assignment.setStatus(AssignmentStatus.PUBLISHED);
        Assignment saved = assignmentRepository.save(assignment);

        // Notify all students in the batch that a new assignment is live
        notificationService.notifyBatch(
                saved.getBatch().getId(),
                "New Assignment: " + saved.getTitle(),
                "Due on " + formatDueDate(saved.getDueDate()) + ". Submit before the deadline.",
                NotificationType.INFO,
                "/student/assignments");

        return AssignmentResponse.from(saved);
    }

    @Override
    @Transactional
    public AssignmentResponse close(Long id) {
        Assignment assignment = findOrThrow(id);
        assignment.setStatus(AssignmentStatus.CLOSED);
        Assignment saved = assignmentRepository.save(assignment);

        notificationService.notifyBatch(
                saved.getBatch().getId(),
                "Assignment Closed: " + saved.getTitle(),
                "This assignment is now closed. Submissions are no longer accepted.",
                NotificationType.INFO,
                "/student/assignments");

        return AssignmentResponse.from(saved);
    }

    @Override
    @Transactional
    public AssignmentResponse reopen(Long id) {
        Assignment assignment = findOrThrow(id);
        assignment.setStatus(AssignmentStatus.PUBLISHED);
        Assignment saved = assignmentRepository.save(assignment);

        notificationService.notifyBatch(
                saved.getBatch().getId(),
                "Assignment Reopened: " + saved.getTitle(),
                "This assignment has been reopened for submissions. Due on " + formatDueDate(saved.getDueDate()) + ".",
                NotificationType.INFO,
                "/student/assignments");

        return AssignmentResponse.from(saved);
    }

    @Override
    public UploadResponse uploadAttachment(MultipartFile file) {
        StoredFile stored = fileStorageService.store(file, "assignments", ALLOWED_ASSIGNMENT_EXTENSIONS);
        return new UploadResponse(stored.url(), stored.originalName());
    }

    private Assignment findOrThrow(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + id));
    }

    /**
     * Returns true if the assignment has a startDate that is strictly in the future
     * (combined with publishTime, or midnight of startDate if no publishTime is set).
     */
    private boolean isPublishDateInFuture(Assignment assignment) {
        if (assignment.getStartDate() == null) {
            return false;
        }
        LocalDateTime publishDateTime = assignment.getPublishTime() != null
                ? LocalDateTime.of(assignment.getStartDate(), assignment.getPublishTime())
                : assignment.getStartDate().atStartOfDay();
        return LocalDateTime.now().isBefore(publishDateTime);
    }

    /**
     * Formats the scheduled publish date/time as a human-readable string,
     * e.g. "12 Sep 2026 at 11:49 AM".
     */
    private String formatPublishDateTime(Assignment assignment) {
        if (assignment.getStartDate() == null) {
            return "the scheduled date";
        }
        String date = assignment.getStartDate().format(
                java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH));
        if (assignment.getPublishTime() != null) {
            String time = assignment.getPublishTime().format(
                    java.time.format.DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH));
            return date + " at " + time;
        }
        return date;
    }

    private String formatDueDate(LocalDate dueDate) {
        if (dueDate == null) {
            return "the deadline";
        }
        return dueDate.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH));
    }

    private void applyRequest(Assignment assignment, AssignmentRequest request) {
        boolean isDraft = request.getStatus() == AssignmentStatus.DRAFT;

        if (!isDraft) {
            if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
                throw new BadRequestException("Description is required");
            }
            if (request.getCourseId() == null) {
                throw new BadRequestException("Course is required");
            }
            if (request.getBatchId() == null) {
                throw new BadRequestException("Batch is required");
            }
            if (request.getStartDate() == null) {
                throw new BadRequestException("Publish / Start Date is required");
            }
            if (request.getDueDate() == null) {
                throw new BadRequestException("Due date is required");
            }
            if (request.getTotalMarks() == null || request.getTotalMarks() < 1 || request.getTotalMarks() > 100) {
                throw new BadRequestException("Please enter correct value below 100");
            }
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

        Course course = null;
        if (request.getCourseId() != null) {
            course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));
        }
        Batch batch = null;
        if (request.getBatchId() != null) {
            batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + request.getBatchId()));
        }

        assignment.setTitle(request.getTitle() != null ? request.getTitle().trim() : "");
        assignment.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
        assignment.setCourse(course);
        assignment.setBatch(batch);
        assignment.setStartDate(request.getStartDate());
        assignment.setPublishTime(request.getPublishTime());
        assignment.setDueDate(request.getDueDate());
        assignment.setCloseTime(request.getCloseTime());
        assignment.setTotalMarks(request.getTotalMarks() != null && request.getTotalMarks() >= 1 ? request.getTotalMarks() : 100);
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
