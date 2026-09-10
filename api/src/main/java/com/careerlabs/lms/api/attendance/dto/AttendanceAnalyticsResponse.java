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
        int totalAll,
        ModeAttendance modeAttendance,
        List<TrainerPerformancePoint> trainerPerformance,
        List<BatchAttendancePoint> batchAttendance
) {
    public AttendanceAnalyticsResponse(
            List<DailyTrendPoint> dailyTrend,
            List<WeeklyTrendPoint> weeklyTrend,
            List<MonthlyTrendPoint> monthlyTrend,
            int overallPct,
            int totalPresent,
            int totalAbsent,
            int totalLate,
            int totalAll
    ) {
        this(dailyTrend, weeklyTrend, monthlyTrend, overallPct, totalPresent, totalAbsent, totalLate, totalAll, null, List.of(), List.of());
    }

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

    public record ModeAttendance(
            int onlineAvgPct,
            int onlineConducted,
            int onlineTotal,
            int offlineAvgPct,
            int offlineConducted,
            int offlineTotal
    ) {}

    public record TrainerPerformancePoint(
            Long trainerId,
            String trainerName,
            int classesConducted,
            int attendancePct
    ) {}

    public record BatchAttendancePoint(
            Long batchId,
            String batchName,
            int classesConducted,
            int attendancePct
    ) {}
}

