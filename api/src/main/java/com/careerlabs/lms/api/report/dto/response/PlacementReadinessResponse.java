package com.careerlabs.lms.api.report.dto.response;

public record PlacementReadinessResponse(
        Long studentId,
        String studentName,
        String batchName,
        Double performancePct,
        Double quizPct,
        Double assignmentCompletionPct,
        Double readinessScore,
        String status,
        String currentPlacementStatus
) {
}
