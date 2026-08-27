package com.careerlabs.lms.api.attendance.dto;

public record LowAttendanceStudentResponse(
        Long studentId,
        Long userId,
        String name,
        String email,
        String phone,
        String enrollmentNo,
        Long batchId,
        String batchName,
        String course,
        int present,
        int absent,
        int late,
        int total,
        int percentage,
        int deficit,
        String risk
) {}
