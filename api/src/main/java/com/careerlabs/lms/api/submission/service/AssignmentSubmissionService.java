package com.careerlabs.lms.api.submission.service;

import com.careerlabs.lms.api.submission.dto.request.ApproveRejectSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.request.GradeSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.response.SubmissionListResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionRowResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface AssignmentSubmissionService {

    SubmissionListResponse listByAssignment(Long assignmentId);

    SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request);

    SubmissionRowResponse approveOrReject(Long assignmentId, Long submissionId, ApproveRejectSubmissionRequest request, String reviewerEmail);

    default SubmissionRowResponse submit(Long assignmentId, Long userId, MultipartFile file, String notes) {
        return submit(assignmentId, userId, file != null ? List.of(file) : List.of(), notes);
    }

    SubmissionRowResponse submit(Long assignmentId, Long userId, List<MultipartFile> files, String notes);
}
