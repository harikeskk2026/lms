package com.careerlabs.lms.api.attendance.dto;

public record AttendanceOverviewItemResponse(
        Long batchId,
        String batchName,
        String course,
        int totalStudents,
        int totalClasses,
        int avgAttendance,
        int lowAttendanceCount,
        int presentToday,
        int totalPresent,
        int totalAbsent,
        int totalLate
) {}
