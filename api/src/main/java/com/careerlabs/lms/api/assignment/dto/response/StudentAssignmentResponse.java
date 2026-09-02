package com.careerlabs.lms.api.assignment.dto.response;

import java.time.Instant;
import java.time.LocalDate;

public record StudentAssignmentResponse(
        Long id,
        String title,
        String description,
        String batchName,
        LocalDate dueDate,
        int maxMarks,
        String attachmentUrl,
        String attachmentName,
        boolean isOverdue,
        SubmissionInfo submission
) {

    public record SubmissionInfo(
            Long id,
            String status,
            Integer grade,
            String feedback,
            String fileUrl,
            String notes,
            Instant submittedAt,
            Instant gradedAt
    ) {
    }
}
