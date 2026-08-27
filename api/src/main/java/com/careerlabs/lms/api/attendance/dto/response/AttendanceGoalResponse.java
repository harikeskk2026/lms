package com.careerlabs.lms.api.attendance.dto.response;

public record AttendanceGoalResponse(
        Integer targetPercentage,
        int currentPercentage,
        int classesNeeded,
        boolean achieved
) {
}
