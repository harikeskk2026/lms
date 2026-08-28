package com.careerlabs.lms.api.announcement.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record ScheduleRequest(
        @NotNull(message = "scheduledAt is required")
        Instant scheduledAt
) {
}
