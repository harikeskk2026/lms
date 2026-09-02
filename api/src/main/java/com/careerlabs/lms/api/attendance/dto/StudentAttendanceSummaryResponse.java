package com.careerlabs.lms.api.attendance.dto;

public record StudentAttendanceSummaryResponse(
        int present,
        int absent,
        int late,
        int total,
        int percentage,
        int neededFor75
) {}
