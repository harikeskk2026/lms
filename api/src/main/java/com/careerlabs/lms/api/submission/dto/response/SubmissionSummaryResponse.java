package com.careerlabs.lms.api.submission.dto.response;

public record SubmissionSummaryResponse(
        int totalStudents,
        int submitted,
        int pending,
        int late
) {
}
