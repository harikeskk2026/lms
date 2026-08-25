package com.careerlabs.lms.api.submission.dto.response;

import java.time.Instant;

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
        String notes
) {
}
