package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.RiskLevel;
import java.time.LocalDate;

public record StudentAttendanceSummaryResponse(
        int present,
        int absent,
        int late,
        int excused,
        int total,
        int percentage,
        int neededFor75,
        int streak,
        LocalDate joiningDate,
        int previousPercentage,
        int currentPercentage,
        int improvement,
        RiskLevel riskLevel,
        int overallPercentage,
        int overallTotal
) {
    public StudentAttendanceSummaryResponse(
            int present,
            int absent,
            int late,
            int excused,
            int total,
            int percentage,
            int neededFor75,
            int streak,
            LocalDate joiningDate,
            int previousPercentage,
            int currentPercentage,
            int improvement,
            RiskLevel riskLevel
    ) {
        this(present, absent, late, excused, total, percentage, neededFor75, streak, joiningDate,
                previousPercentage, currentPercentage, improvement, riskLevel, percentage, total);
    }

    public StudentAttendanceSummaryResponse(int present, int absent, int late, int total, int percentage, int neededFor75) {
        this(present, absent, late, 0, total, percentage, neededFor75, 0, null, percentage, percentage, 0, RiskLevel.HEALTHY, percentage, total);
    }
}
