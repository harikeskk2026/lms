package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

public record PerformanceReportResponse(
        ReportSummaryResponse summary,
        List<ReportStudentResponse> students,
        List<CourseBreakdown> courseBreakdown,
        List<BatchBreakdown> batchBreakdown,
        List<TrendPoint> performanceTrend,
        List<AtRiskBreakdown> atRiskBreakdown
) {

    public record CourseBreakdown(Long courseId, String courseTitle, Double averageScorePct,
                                   long totalAssignments, long totalSubmissions,
                                   Double passRatePct, String difficultyStatus) {
    }

    public record BatchBreakdown(Long batchId, String batchName, long studentCount,
                                  Double assignmentCompletionPct, Double averageScorePct,
                                  Double overallPerformancePct) {
    }

    /** period is an ISO week label, e.g. "2026-W34", computed from real AssignmentSubmission.submittedAt dates. */
    public record TrendPoint(String period, Double averageScorePct) {
    }

    /** Reason -> count of currently at-risk students flagged for that reason (quiz/attendance reasons omitted — no such data exists). */
    public record AtRiskBreakdown(String reason, long count) {
    }
}
