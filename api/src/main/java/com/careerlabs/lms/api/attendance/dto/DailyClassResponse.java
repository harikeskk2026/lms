package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public record DailyClassResponse(
        Long id,
        Long batchId,
        String batchName,
        String courseTitle,
        LocalDateTime date,
        String title,
        String notes,
        String recordingUrl,
        String meetLink,
        ClassStatus status,
        Instant createdAt,
        int totalPresent,
        int totalAbsent,
        int totalLate,
        int totalStudents
) {}
