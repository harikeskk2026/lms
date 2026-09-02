package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;

public record AttendanceSheetItemResponse(
        Long studentId,
        Long userId,
        String name,
        String email,
        String enrollmentNo,
        AttendStatus status,
        String remarks
) {}
