package com.careerlabs.lms.api.report.dto.response;

public record OverviewResponse(
        long totalStudents,
        long activeBatches,
        long activeCourses,
        Double averageAttendancePct,
        Double averagePerformancePct,
        Double assignmentCompletionPct,
        Double quizAveragePct,
        Double placementRatePct,
        long atRiskStudentCount
) {
}
