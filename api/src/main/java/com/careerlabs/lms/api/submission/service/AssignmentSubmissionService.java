package com.careerlabs.lms.api.submission.service;

import com.careerlabs.lms.api.submission.dto.request.GradeSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.response.SubmissionListResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionRowResponse;
import org.springframework.web.multipart.MultipartFile;

public interface AssignmentSubmissionService {

    SubmissionListResponse listByAssignment(Long assignmentId);

    SubmissionRowResponse grade(Long assignmentId, Long submissionId, GradeSubmissionRequest request);

    SubmissionRowResponse submit(Long assignmentId, Long userId, MultipartFile file, String notes);
}
