package com.careerlabs.lms.api.attendance.dto.response;

public record AttendanceCommandCenterResponse(
        int totalStudents,
        int todaysClasses,
        int averageAttendance,
        int below75Count,
        int criticalCount,
        int unmarkedClasses
) {
}
