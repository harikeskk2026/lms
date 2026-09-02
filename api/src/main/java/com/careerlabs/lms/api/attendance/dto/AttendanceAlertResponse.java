package com.careerlabs.lms.api.attendance.dto;

import java.time.Instant;

public record AttendanceAlertResponse(
        Long id,
        Long studentId,
        Long userId,
        String studentName,
        String studentEmail,
        String phone,
        Long batchId,
        String batchName,
        String courseTitle,
        Double threshold,
        Double currentPct,
        String message,
        boolean isResolved,
        Instant createdAt,
        Instant resolvedAt
) {}
