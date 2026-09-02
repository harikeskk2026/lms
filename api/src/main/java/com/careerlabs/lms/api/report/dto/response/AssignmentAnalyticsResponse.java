package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

public record AssignmentAnalyticsResponse(
        Double submissionRatePct,
        Double lateRatePct,
        Double missingRatePct,
        Double averageScorePct,
        List<BatchCompletion> byBatch
) {

    public record BatchCompletion(Long batchId, String batchName, Double completionPct) {
    }
}
