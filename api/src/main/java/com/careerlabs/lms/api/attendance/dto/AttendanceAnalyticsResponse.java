package com.careerlabs.lms.api.attendance.dto;

import java.util.List;

public record AttendanceAnalyticsResponse(
        List<DailyTrendPoint> dailyTrend,
        List<WeeklyTrendPoint> weeklyTrend,
        List<MonthlyTrendPoint> monthlyTrend,
        int overallPct,
        int totalPresent,
        int totalAbsent,
        int totalLate,
        int totalAll
) {
    public record DailyTrendPoint(
            String date,
            String label,
            String classTitle,
            String batchName,
            int present,
            int absent,
            int late,
            int total,
            int pct,
            String week
    ) {}

    public record WeeklyTrendPoint(
            String week,
            int present,
            int absent,
            int late,
            int total,
            int pct
    ) {}

    public record MonthlyTrendPoint(
            String month,
            int present,
            int absent,
            int late,
            int total,
            int pct
    ) {}
}
