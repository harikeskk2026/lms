package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

public record ReportStudentResponse(
        Long studentId,
        String studentName,
        String batchName,
        Double attendancePct,
        Double avgQuizScore,
        long assignmentsSubmitted,
        Double avgGrade,
        Double assignmentCompletionPct,
        Double overallPerformancePct,
        String status,
        List<String> reasons,
        List<CourseScore> courseBreakdown,
        Integer riskScore,
        String riskLevel,
        List<TrendPointResponse> progressTrend,
        Integer presentCount,
        Integer absentCount
) {

    public record CourseScore(Long courseId, String courseTitle, Double averageScorePct) {
    }
}
