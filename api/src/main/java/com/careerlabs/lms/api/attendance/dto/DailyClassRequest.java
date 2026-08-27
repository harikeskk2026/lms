package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record DailyClassRequest(
        @NotNull(message = "batchId is required")
        Long batchId,

        @NotNull(message = "date is required")
        LocalDateTime date,

        @NotNull(message = "title is required")
        String title,

        String notes,
        String recordingUrl,
        String meetLink,
        ClassStatus status
) {}
