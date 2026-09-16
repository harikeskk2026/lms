package com.careerlabs.lms.api.submission.service;

import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.submission.dto.request.ApproveRejectSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.request.GradeSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.response.SubmissionListResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionRowResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface AssignmentSubmissionService {

    SubmissionListResponse listByAssignment(Long assignmentId, String search, com.careerlabs.lms.api.submission.dto.response.SubmissionStatus status, String evaluation, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, JwtUserPrincipal principal);

    default SubmissionListResponse listByAssignment(Long assignmentId, JwtUserPrincipal principal) {
        return listByAssignment(assignmentId, null, null, null, null, null, principal);
    }

    default SubmissionListResponse listByAssignment(Long assignmentId) {
        return listByAssignment(assignmentId, null, null, null, null, null, null);
    }

    SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request, JwtUserPrincipal principal);
    default SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request) {
        return grade(assignmentId, submissionId, request, null);
    }

    SubmissionRowResponse approveOrReject(Long assignmentId, Long submissionId, ApproveRejectSubmissionRequest request, String reviewerEmail, JwtUserPrincipal principal);
    default SubmissionRowResponse approveOrReject(Long assignmentId, Long submissionId, ApproveRejectSubmissionRequest request, String reviewerEmail) {
        return approveOrReject(assignmentId, submissionId, request, reviewerEmail, null);
    }

    default SubmissionRowResponse submit(Long assignmentId, Long userId, MultipartFile file, String notes) {
        return submit(assignmentId, userId, file != null ? List.of(file) : List.of(), notes);
    }

    SubmissionRowResponse submit(Long assignmentId, Long userId, List<MultipartFile> files, String notes);
}
