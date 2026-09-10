package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.InterviewResult;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/** Payload to complete a placement interview and record its result. */
public record CompleteInterviewRequest(
        @NotNull String status,
        InterviewResult result,
        Double score,
        String feedback,
        String notes,
        Instant scheduledAt
) {}