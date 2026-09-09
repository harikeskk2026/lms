package com.careerlabs.lms.api.submission.service.impl;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.dto.request.ApproveRejectSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.request.GradeSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.response.SubmissionAttachmentResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionListResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionRowResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionStatus;
import com.careerlabs.lms.api.submission.dto.response.SubmissionSummaryResponse;
import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.entity.SubmissionAttachment;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.submission.service.AssignmentSubmissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AssignmentSubmissionServiceImpl implements AssignmentSubmissionService {

    private final AssignmentSubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;

    public AssignmentSubmissionServiceImpl(AssignmentSubmissionRepository submissionRepository,
                                            AssignmentRepository assignmentRepository,
                                            StudentRepository studentRepository,
                                            EnrollmentRepository enrollmentRepository,
                                            FileStorageService fileStorageService,
                                            NotificationService notificationService) {
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionListResponse listByAssignment(Long assignmentId) {
        Assignment assignment = findAssignmentOrThrow(assignmentId);

        List<Student> students = studentRepository.findByBatchId(assignment.getBatch().getId());
        Map<Long, AssignmentSubmission> byStudentId = submissionRepository.findByAssignmentId(assignmentId).stream()
                .collect(Collectors.toMap(s -> s.getStudent().getId(), Function.identity()));

        List<SubmissionRowResponse> rows = students.stream()
                .map(student -> {
                    AssignmentSubmission submission = byStudentId.get(student.getId());
                    return submission != null ? toRow(submission) : pendingRow(student);
                })
                .sorted(Comparator.comparing(SubmissionRowResponse::studentName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        int submitted = (int) rows.stream().filter(r -> r.status() == SubmissionStatus.SUBMITTED).count();
        int late = (int) rows.stream().filter(r -> r.status() == SubmissionStatus.LATE).count();
        int total = rows.size();
        int pending = (int) rows.stream().filter(r -> r.status() == SubmissionStatus.PENDING || r.status() == SubmissionStatus.PENDING_APPROVAL).count();

        return new SubmissionListResponse(rows, new SubmissionSummaryResponse(total, submitted, pending, late));
    }

    @Override
    @Transactional
    public SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        if (!submission.getAssignment().getId().equals(assignmentId)) {
            throw new ResourceNotFoundException("Submission not found: " + submissionId);
        }

        if (request.getMarks() != null) {
            if (request.getMarks() > submission.getAssignment().getTotalMarks()) {
                throw new BadRequestException("Marks cannot exceed the assignment's total marks");
            }
            submission.setMarks(request.getMarks());
        }
        if (request.getFeedback() != null) {
            submission.setFeedback(request.getFeedback());
        }
        if (request.getReviewed() != null) {
            submission.setReviewed(request.getReviewed());
        }

        SubmissionRowResponse result = toRow(submissionRepository.save(submission));

        // Notify the student that their submission has been reviewed
        Long studentUserId = submission.getStudent().getUser().getId();
        String assignmentTitle = submission.getAssignment().getTitle();
        String scoreText = submission.getMarks() != null
                ? submission.getMarks() + "/" + submission.getAssignment().getTotalMarks()
                : "—";
        notificationService.notifyUser(
                studentUserId,
                "\u2705 Assignment Graded: " + assignmentTitle,
                "Your score: " + scoreText + "."
                        + (submission.getFeedback() != null ? " Feedback: " + submission.getFeedback() : ""),
                NotificationType.SUCCESS,
                "/student/assignments"
        );

        return result;
    }

    @Override
    @Transactional
    public SubmissionRowResponse approveOrReject(Long assignmentId, Long submissionId, ApproveRejectSubmissionRequest request, String reviewerEmail) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        if (!submission.getAssignment().getId().equals(assignmentId)) {
            throw new ResourceNotFoundException("Submission not found: " + submissionId);
        }

        String action = request.getAction() != null ? request.getAction().trim().toUpperCase() : "";
        if (!"APPROVE".equals(action) && !"REJECT".equals(action)) {
            throw new BadRequestException("Action must be either APPROVE or REJECT");
        }

        Long studentUserId = submission.getStudent().getUser().getId();
        String assignmentTitle = submission.getAssignment().getTitle();

        if ("APPROVE".equals(action)) {
            submission.setStatus(submission.isLate() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
            submission.setApprovedAt(Instant.now());
            submission.setApprovedBy(reviewerEmail != null ? reviewerEmail : "Admin");
            submission.setRejectionReason(null);

            notificationService.notifyUser(
                    studentUserId,
                    "✅ Assignment Approved: " + assignmentTitle,
                    "Your submission for \"" + assignmentTitle + "\" has been approved by the admin.",
                    NotificationType.SUCCESS,
                    "/student/assignments"
            );
        } else {
            submission.setStatus(SubmissionStatus.REJECTED);
            submission.setRejectionReason(request.getReason() != null ? request.getReason().trim() : null);
            submission.setApprovedAt(null);
            submission.setApprovedBy(null);

            String reasonMsg = (submission.getRejectionReason() != null && !submission.getRejectionReason().isEmpty())
                    ? " Reason: " + submission.getRejectionReason()
                    : "";
            notificationService.notifyUser(
                    studentUserId,
                    "❌ Assignment Rejected: " + assignmentTitle,
                    "Your submission for \"" + assignmentTitle + "\" was rejected." + reasonMsg + " You may resubmit your assignment.",
                    NotificationType.WARNING,
                    "/student/assignments"
            );
        }

        AssignmentSubmission saved = submissionRepository.save(submission);
        return toRow(saved);
    }

    @Override
    @Transactional
    public SubmissionRowResponse submit(Long assignmentId, Long userId, List<MultipartFile> files, String notes) {
        Assignment assignment = findAssignmentOrThrow(assignmentId);
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        boolean isEnrolledInBatch = (student.getBatch() != null && student.getBatch().getId().equals(assignment.getBatch().getId()))
                || enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId()).stream()
                        .anyMatch(e -> e.getBatch() != null && e.getBatch().getId().equals(assignment.getBatch().getId()));

        if (!isEnrolledInBatch) {
            throw new BadRequestException("You are not enrolled in this assignment's batch");
        }

        Optional<AssignmentSubmission> existingOpt = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId());
        AssignmentSubmission submission;
        if (existingOpt.isPresent()) {
            AssignmentSubmission existing = existingOpt.get();
            if (existing.getStatus() == SubmissionStatus.REJECTED) {
                // Student resubmitting after rejection
                submission = existing;
                submission.setMarks(null);
                submission.setFeedback(null);
                submission.setReviewed(false);
                submission.setRejectionReason(null);
                submission.setApprovedAt(null);
                submission.setApprovedBy(null);
            } else {
                throw new ConflictException("You have already submitted this assignment");
            }
        } else {
            submission = new AssignmentSubmission();
            submission.setAssignment(assignment);
            submission.setStudent(student);
        }

        if (files == null || files.stream().noneMatch(f -> f != null && !f.isEmpty())) {
            throw new BadRequestException("Please select at least one file to upload");
        }

        List<MultipartFile> validFiles = files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        List<SubmissionAttachment> attachments = new ArrayList<>();
        String primaryFileUrl = null;
        String primaryFileName = null;

        for (MultipartFile file : validFiles) {
            StoredFile stored = fileStorageService.store(file, "submissions");
            SubmissionAttachment att = new SubmissionAttachment(stored.url(), stored.originalName());
            attachments.add(att);
            if (primaryFileUrl == null) {
                primaryFileUrl = stored.url();
                primaryFileName = stored.originalName();
            }
        }

        submission.setFileUrl(primaryFileUrl);
        submission.setFileName(primaryFileName);
        submission.setAttachments(attachments);
        submission.setNotes(notes);
        submission.setSubmittedAt(Instant.now());
        submission.setLate(LocalDate.now().isAfter(assignment.getDueDate()));
        submission.setStatus(SubmissionStatus.PENDING_APPROVAL);

        AssignmentSubmission saved = submissionRepository.save(submission);

        // Notify all admins about the new student submission awaiting approval
        notificationService.notifyAdmins(
                "\uD83D\uDCE9 New Submission: " + assignment.getTitle(),
                student.getUser().getName() + " submitted " + assignment.getTitle()
                        + " (awaiting approval)" + (saved.isLate() ? " (late)" : "") + ".",
                NotificationType.INFO,
                "/admin/assignments"
        );

        return toRow(saved);
    }

    private Assignment findAssignmentOrThrow(Long assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
    }

    private SubmissionRowResponse toRow(AssignmentSubmission submission) {
        Student student = submission.getStudent();
        List<SubmissionAttachmentResponse> files = submission.getAttachments() != null && !submission.getAttachments().isEmpty()
                ? submission.getAttachments().stream().map(a -> new SubmissionAttachmentResponse(a.getFileUrl(), a.getFileName())).toList()
                : (submission.getFileUrl() != null ? List.of(new SubmissionAttachmentResponse(submission.getFileUrl(), submission.getFileName())) : List.of());

        SubmissionStatus status = submission.getStatus() != null
                ? submission.getStatus()
                : (submission.isLate() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);

        return new SubmissionRowResponse(
                submission.getId(),
                student.getId(),
                student.getUser().getName(),
                student.getUser().getEmail(),
                status,
                submission.getSubmittedAt(),
                submission.getMarks(),
                submission.getFeedback(),
                submission.isReviewed(),
                submission.getFileUrl(),
                submission.getFileName(),
                submission.getNotes(),
                files,
                submission.getRejectionReason(),
                submission.getApprovedAt(),
                submission.getApprovedBy());
    }

    private SubmissionRowResponse pendingRow(Student student) {
        return new SubmissionRowResponse(
                null,
                student.getId(),
                student.getUser().getName(),
                student.getUser().getEmail(),
                SubmissionStatus.PENDING,
                null, null, null, false, null, null, null,
                List.of(), null, null, null);
    }
}
