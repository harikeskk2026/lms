package com.careerlabs.lms.api.submission.dto.response;

import java.time.Instant;
import java.util.List;

public record SubmissionRowResponse(
        Long submissionId,
        Long studentId,
        String studentName,
        String studentEmail,
        SubmissionStatus status,
        Instant submittedAt,
        Integer marks,
        String feedback,
        boolean reviewed,
        String fileUrl,
        String fileName,
        String notes,
        List<SubmissionAttachmentResponse> files,
        String rejectionReason,
        Instant approvedAt,
        String approvedBy
) {
    public SubmissionRowResponse(
            Long submissionId,
            Long studentId,
            String studentName,
            String studentEmail,
            SubmissionStatus status,
            Instant submittedAt,
            Integer marks,
            String feedback,
            boolean reviewed,
            String fileUrl,
            String fileName,
            String notes,
            List<SubmissionAttachmentResponse> files
    ) {
        this(submissionId, studentId, studentName, studentEmail, status, submittedAt, marks, feedback, reviewed, fileUrl, fileName, notes, files, null, null, null);
    }

    public SubmissionRowResponse(
            Long submissionId,
            Long studentId,
            String studentName,
            String studentEmail,
            SubmissionStatus status,
            Instant submittedAt,
            Integer marks,
            String feedback,
            boolean reviewed,
            String fileUrl,
            String fileName,
            String notes
    ) {
        this(submissionId, studentId, studentName, studentEmail, status, submittedAt, marks, feedback, reviewed, fileUrl, fileName, notes, List.of(), null, null, null);
    }
}
