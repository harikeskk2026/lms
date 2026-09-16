package com.careerlabs.lms.api.submission.service.impl;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
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
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    private final UserRepository userRepository;

    public AssignmentSubmissionServiceImpl(AssignmentSubmissionRepository submissionRepository,
                                            AssignmentRepository assignmentRepository,
                                            StudentRepository studentRepository,
                                            EnrollmentRepository enrollmentRepository,
                                            FileStorageService fileStorageService,
                                            NotificationService notificationService,
                                            UserRepository userRepository) {
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private void requireAssignmentBatchOwnership(Assignment assignment, JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) return;
        String role = principal.role().toUpperCase();
        if ("TRAINER".equals(role) || "ROLE_TRAINER".equals(role)) {
            if (assignment == null || assignment.getBatch() == null || assignment.getBatch().getTrainerId() == null
                    || !assignment.getBatch().getTrainerId().equals(principal.id())) {
                throw new ForbiddenException("You are not authorized to access or grade submissions for this batch");
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionListResponse listByAssignment(Long assignmentId) {
        return listByAssignment(assignmentId, null, null, null, null, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionListResponse listByAssignment(Long assignmentId, JwtUserPrincipal principal) {
        return listByAssignment(assignmentId, null, null, null, null, null, principal);
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionListResponse listByAssignment(Long assignmentId, String search, SubmissionStatus status,
                                                   String evaluation, LocalDate dateFrom, LocalDate dateTo,
                                                   JwtUserPrincipal principal) {
        Assignment assignment = findAssignmentOrThrow(assignmentId);
        requireAssignmentBatchOwnership(assignment, principal);

        List<Student> students = (assignment.getBatch() != null && assignment.getBatch().getId() != null)
                ? enrollmentRepository.findActiveStudentsByBatchId(assignment.getBatch().getId())
                : List.of();
        Map<Long, AssignmentSubmission> byStudentId = submissionRepository.findByAssignmentId(assignmentId).stream()
                .filter(s -> s.getStudent() != null && s.getStudent().getId() != null)
                .collect(Collectors.toMap(s -> s.getStudent().getId(), Function.identity(), (existing, replacing) -> existing));

        List<SubmissionRowResponse> allRows = new ArrayList<>(students.stream()
                .map(student -> {
                    AssignmentSubmission submission = byStudentId.get(student.getId());
                    return submission != null ? toRow(submission) : pendingRow(student);
                })
                .toList());

        // Include any existing submissions from students who may not be in the active enrollment list
        Set<Long> enrolledStudentIds = students.stream().map(Student::getId).collect(Collectors.toSet());
        byStudentId.values().stream()
                .filter(sub -> sub.getStudent() != null && !enrolledStudentIds.contains(sub.getStudent().getId()))
                .forEach(sub -> allRows.add(toRow(sub)));

        allRows.sort(Comparator.comparing(
                r -> (r.studentName() != null ? r.studentName() : ""),
                String.CASE_INSENSITIVE_ORDER));

        int submitted = (int) allRows.stream().filter(r -> r.status() == SubmissionStatus.SUBMITTED).count();
        int late = (int) allRows.stream().filter(r -> r.status() == SubmissionStatus.LATE).count();
        int total = allRows.size();
        int pending = (int) allRows.stream().filter(r -> r.status() == SubmissionStatus.PENDING || r.status() == SubmissionStatus.PENDING_APPROVAL).count();

        // Apply backend filters
        String cleanSearch = search != null ? search.trim().toLowerCase() : null;
        java.time.ZoneId zone = java.time.ZoneId.systemDefault();

        List<SubmissionRowResponse> filteredRows = allRows.stream().filter(row -> {
            if (cleanSearch != null && !cleanSearch.isEmpty()) {
                boolean matchName = row.studentName() != null && row.studentName().toLowerCase().contains(cleanSearch);
                boolean matchEmail = row.studentEmail() != null && row.studentEmail().toLowerCase().contains(cleanSearch);
                boolean matchId = row.studentId() != null && String.valueOf(row.studentId()).contains(cleanSearch);
                if (!matchName && !matchEmail && !matchId) {
                    return false;
                }
            }
            if (status != null && row.status() != status) {
                return false;
            }
            if ("EVALUATED".equalsIgnoreCase(evaluation)) {
                boolean isEval = row.reviewed() || row.marks() != null;
                if (!isEval) return false;
            } else if ("PENDING".equalsIgnoreCase(evaluation)) {
                boolean isPendingEval = row.submissionId() != null &&
                        (row.status() == SubmissionStatus.SUBMITTED || row.status() == SubmissionStatus.LATE || row.status() == SubmissionStatus.PENDING_APPROVAL) &&
                        !row.reviewed() && row.marks() == null;
                if (!isPendingEval) return false;
            }
            if (dateFrom != null) {
                if (row.submittedAt() == null) return false;
                LocalDate subDate = row.submittedAt().atZone(zone).toLocalDate();
                if (subDate.isBefore(dateFrom)) return false;
            }
            if (dateTo != null) {
                if (row.submittedAt() == null) return false;
                LocalDate subDate = row.submittedAt().atZone(zone).toLocalDate();
                if (subDate.isAfter(dateTo)) return false;
            }
            return true;
        }).toList();

        return new SubmissionListResponse(filteredRows, new SubmissionSummaryResponse(total, submitted, pending, late));
    }

    private static final Set<String> ALLOWED_SUBMISSION_EXTENSIONS = Set.of(
            "pdf", "docx", "doc", "xls", "xlsx", "csv", "txt", "ppt", "pptx",
            "png", "jpg", "jpeg", "webp", "gif", "svg", "zip"
    );

    @Override
    @Transactional
    public SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request) {
        return grade(assignmentId, submissionId, request, null);
    }

    @Override
    @Transactional
    public SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request, JwtUserPrincipal principal) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        if (submission.getAssignment() == null || !submission.getAssignment().getId().equals(assignmentId)) {
            throw new ResourceNotFoundException("Submission not found: " + submissionId);
        }
        requireAssignmentBatchOwnership(submission.getAssignment(), principal);

        if (request.getMarks() != null) {
            if (request.getMarks() < 0) {
                throw new BadRequestException("Marks cannot be negative");
            }
            int maxMarks = submission.getAssignment() != null
                    ? submission.getAssignment().getTotalMarks()
                    : 100;
            if (request.getMarks() > maxMarks) {
                throw new BadRequestException("Marks cannot exceed the assignment's total marks (" + maxMarks + ")");
            }
            submission.setMarks(request.getMarks());
        }
        if (request.getFeedback() != null) {
            submission.setFeedback(request.getFeedback().trim().isEmpty() ? null : request.getFeedback().trim());
        }
        submission.setReviewed(true);

        // If grading an unapproved submission, transition status to approved (SUBMITTED or LATE)
        if (submission.getStatus() == SubmissionStatus.PENDING_APPROVAL) {
            submission.setStatus(submission.isLate() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
            if (submission.getApprovedAt() == null) {
                submission.setApprovedAt(Instant.now());
            }
            if (submission.getApprovedBy() == null) {
                String graderName = principal != null && principal.id() != null
                        ? userRepository.findById(principal.id()).map(User::getName).orElse(principal.email())
                        : "Trainer";
                submission.setApprovedBy(graderName);
            }
        }

        SubmissionRowResponse result = toRow(submissionRepository.save(submission));

        // Notify the student that their submission has been reviewed
        Long studentUserId = (submission.getStudent() != null && submission.getStudent().getUser() != null)
                ? submission.getStudent().getUser().getId()
                : null;
        String assignmentTitle = submission.getAssignment() != null ? submission.getAssignment().getTitle() : "Assignment";
        String scoreText = submission.getMarks() != null
                ? submission.getMarks() + "/" + (submission.getAssignment() != null ? submission.getAssignment().getTotalMarks() : 100)
                : "—";
        if (studentUserId != null) {
            notificationService.notifyUser(
                    studentUserId,
                    "Assignment Graded: " + assignmentTitle,
                    "Your score: " + scoreText + "."
                            + (submission.getFeedback() != null ? " Feedback: " + submission.getFeedback() : ""),
                    NotificationType.SUCCESS,
                    "/student/assignments"
            );
        }

        return result;
    }

    @Override
    @Transactional
    public SubmissionRowResponse approveOrReject(Long assignmentId, Long submissionId, ApproveRejectSubmissionRequest request, String reviewerEmail) {
        return approveOrReject(assignmentId, submissionId, request, reviewerEmail, null);
    }

    @Override
    @Transactional
    public SubmissionRowResponse approveOrReject(Long assignmentId, Long submissionId, ApproveRejectSubmissionRequest request, String reviewerEmail, JwtUserPrincipal principal) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        if (submission.getAssignment() == null || !submission.getAssignment().getId().equals(assignmentId)) {
            throw new ResourceNotFoundException("Submission not found: " + submissionId);
        }
        requireAssignmentBatchOwnership(submission.getAssignment(), principal);

        String action = request.getAction() != null ? request.getAction().trim().toUpperCase() : "";
        if (!"APPROVE".equals(action) && !"REJECT".equals(action)) {
            throw new BadRequestException("Action must be either APPROVE or REJECT");
        }

        Long studentUserId = (submission.getStudent() != null && submission.getStudent().getUser() != null)
                ? submission.getStudent().getUser().getId()
                : null;
        String assignmentTitle = submission.getAssignment() != null ? submission.getAssignment().getTitle() : "Assignment";

        // Accurately resolve acting reviewer name and role title
        String reviewerRole = principal != null && principal.role() != null ? principal.role().toUpperCase() : "";
        boolean isTrainerReviewer = "TRAINER".equals(reviewerRole) || "ROLE_TRAINER".equals(reviewerRole);

        String actorName = null;
        if (principal != null && principal.id() != null) {
            actorName = userRepository.findById(principal.id()).map(User::getName).orElse(null);
        }
        if (actorName == null && reviewerEmail != null) {
            actorName = userRepository.findByEmailIgnoreCase(reviewerEmail).map(User::getName).orElse(reviewerEmail);
        }
        if (actorName == null) {
            actorName = isTrainerReviewer ? "Trainer" : "Admin";
        }

        String roleTitle = isTrainerReviewer ? "your trainer" : "the administrator";
        String attribution = actorName != null ? roleTitle + " (" + actorName + ")" : roleTitle;

        if ("APPROVE".equals(action)) {
            submission.setStatus(submission.isLate() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
            submission.setApprovedAt(Instant.now());
            submission.setApprovedBy(actorName);
            submission.setRejectionReason(null);

            if (studentUserId != null) {
                notificationService.notifyUser(
                        studentUserId,
                        "Assignment Approved: " + assignmentTitle,
                        "Your submission for \"" + assignmentTitle + "\" has been approved by " + attribution + ".",
                        NotificationType.SUCCESS,
                        "/student/assignments"
                );
            }
        } else {
            submission.setStatus(SubmissionStatus.REJECTED);
            submission.setRejectionReason(request.getReason() != null ? request.getReason().trim() : null);
            submission.setApprovedAt(null);
            submission.setApprovedBy(null);

            String reasonMsg = (submission.getRejectionReason() != null && !submission.getRejectionReason().isEmpty())
                    ? " Reason: " + submission.getRejectionReason() + "."
                    : "";
            if (studentUserId != null) {
                notificationService.notifyUser(
                        studentUserId,
                        "Assignment Rejected: " + assignmentTitle,
                        "Your submission for \"" + assignmentTitle + "\" was rejected by " + attribution + "." + reasonMsg + " You may resubmit your assignment.",
                        NotificationType.WARNING,
                        "/student/assignments"
                );
            }
        }

        AssignmentSubmission saved = submissionRepository.save(submission);
        return toRow(saved);
    }

    @Override
    @Transactional
    public SubmissionRowResponse submit(Long assignmentId, Long userId, MultipartFile file, String notes) {
        return submit(assignmentId, userId, file != null ? List.of(file) : List.of(), notes);
    }

    @Override
    @Transactional
    public SubmissionRowResponse submit(Long assignmentId, Long userId, List<MultipartFile> files, String notes) {
        Assignment assignment = findAssignmentOrThrow(assignmentId);
        if (assignment.getStatus() == AssignmentStatus.CLOSED || assignment.getStatus() == AssignmentStatus.DRAFT) {
            throw new BadRequestException("This assignment is closed. Submissions are no longer accepted.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime closeDateTime = assignment.getDueDate() != null
                ? (assignment.getCloseTime() != null
                        ? LocalDateTime.of(assignment.getDueDate(), assignment.getCloseTime())
                        : assignment.getDueDate().atTime(23, 59, 59))
                : null;
        boolean isLate = closeDateTime != null && now.isAfter(closeDateTime);

        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        if (assignment.getBatch() == null) {
            throw new BadRequestException("This assignment does not belong to any batch");
        }

        boolean isEnrolledInBatch = enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(student.getId(), assignment.getBatch().getId());

        if (!isEnrolledInBatch) {
            throw new BadRequestException("You are not enrolled in this assignment's batch");
        }

        Optional<AssignmentSubmission> existingOpt = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId());
        AssignmentSubmission submission;
        if (existingOpt.isPresent()) {
            AssignmentSubmission existing = existingOpt.get();
            if (existing.getStatus() == SubmissionStatus.REJECTED) {
                // Student resubmitting after rejection - clean up old uploaded files
                if (existing.getFileUrl() != null) {
                    fileStorageService.delete(existing.getFileUrl());
                }
                if (existing.getAttachments() != null) {
                    existing.getAttachments().forEach(att -> {
                        if (att != null && att.getFileUrl() != null) {
                            fileStorageService.delete(att.getFileUrl());
                        }
                    });
                }
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

        for (MultipartFile fileItem : validFiles) {
            StoredFile stored = fileStorageService.store(fileItem, "submissions", ALLOWED_SUBMISSION_EXTENSIONS);
            SubmissionAttachment att = new SubmissionAttachment(stored.url(), stored.originalName());
            attachments.add(att);
            if (primaryFileUrl == null) {
                primaryFileUrl = stored.url();
                primaryFileName = stored.originalName();
            }
        }

        submission.setFileUrl(primaryFileUrl);
        submission.setFileName(primaryFileName);
        if (submission.getAttachments() != null) {
            submission.getAttachments().clear();
            submission.getAttachments().addAll(attachments);
        } else {
            submission.setAttachments(attachments);
        }
        submission.setNotes(notes);
        submission.setSubmittedAt(Instant.now());
        submission.setLate(isLate);
        submission.setStatus(SubmissionStatus.PENDING_APPROVAL);

        AssignmentSubmission saved = submissionRepository.save(submission);

        // Notify all admins about the new student submission awaiting approval
        String studentName = (student.getUser() != null && student.getUser().getName() != null)
                ? student.getUser().getName()
                : "Student";
        notificationService.notifyAdmins(
                "\uD83D\uDCE9 New Submission: " + assignment.getTitle(),
                studentName + " submitted " + assignment.getTitle()
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
                ? submission.getAttachments().stream()
                        .filter(a -> a != null)
                        .map(a -> new SubmissionAttachmentResponse(a.getFileUrl(), a.getFileName()))
                        .toList()
                : (submission.getFileUrl() != null
                        ? List.of(new SubmissionAttachmentResponse(submission.getFileUrl(), submission.getFileName()))
                        : List.of());

        SubmissionStatus status = submission.getStatus() != null
                ? submission.getStatus()
                : (submission.isLate() ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);

        Long studentId = student != null ? student.getId() : null;
        String studentName = (student != null && student.getUser() != null && student.getUser().getName() != null)
                ? student.getUser().getName()
                : "—";
        String studentEmail = (student != null && student.getUser() != null && student.getUser().getEmail() != null)
                ? student.getUser().getEmail()
                : "—";

        return new SubmissionRowResponse(
                submission.getId(),
                studentId,
                studentName,
                studentEmail,
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
        Long studentId = student != null ? student.getId() : null;
        String studentName = (student != null && student.getUser() != null && student.getUser().getName() != null)
                ? student.getUser().getName()
                : "—";
        String studentEmail = (student != null && student.getUser() != null && student.getUser().getEmail() != null)
                ? student.getUser().getEmail()
                : "—";

        return new SubmissionRowResponse(
                null,
                studentId,
                studentName,
                studentEmail,
                SubmissionStatus.PENDING,
                null, null, null, false, null, null, null,
                List.of(), null, null, null);
    }
}
