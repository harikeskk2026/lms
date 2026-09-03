package com.careerlabs.lms.api.dashboard.dto.response;

import com.careerlabs.lms.api.report.dto.response.PerformanceReportResponse;
import java.util.List;

public record SuperAdminDashboardResponse(
        Overview overview,
        Performance performance,
        Attendance attendance,
        Placement placement,
        List<AdminDashboardResponse.UpcomingSession> upcomingSessions,
        List<AdminDashboardResponse.ActivityItem> recentActivity
) {

    public record Overview(
            long totalStudents,
            long activeStudents,
            long totalTrainers,
            long activeTrainers,
            long totalBatches,
            long activeBatches,
            long totalCourses,
            long totalColleges
    ) {
    }

    public record Performance(
            Double averagePerformancePct,
            List<PerformanceReportResponse.TrendPoint> trend,
            long atRiskCount,
            long needsImprovementCount
    ) {
    }

    public record Attendance(
            int healthy,
            int atRisk,
            int critical,
            int overallPct
    ) {
    }

    public record Placement(
            long activeDrives,
            long interestedStudents,
            long availableDrives
    ) {
    }
}
