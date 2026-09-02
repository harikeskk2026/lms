package com.careerlabs.lms.api.report.dto.response;

public record BatchHealthResponse(
        Long batchId,
        String batchName,
        Double attendancePct,
        Double performancePct,
        Double assignmentCompletionPct,
        Double quizAveragePct,
        Double placementRatePct,
        Double healthScore,
        String status
) {
}
