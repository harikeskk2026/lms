package com.careerlabs.lms.api.report.dto.response;

public record ReportSummaryResponse(
        long totalStudents,
        Double averageScorePct,
        Double averageCompletionPct,
        Double overallPerformancePct,
        Double averageQuizScorePct
) {
}
