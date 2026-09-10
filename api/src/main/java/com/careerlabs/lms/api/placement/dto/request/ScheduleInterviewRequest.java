package com.careerlabs.lms.api.placement.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/** Payload for scheduling a placement interview for a candidate on a round. */
public record ScheduleInterviewRequest(
        @NotNull Long roundId,
        @NotNull Long studentId,
        Long interviewerId,
        @NotNull Instant scheduledAt,
        String meetingLink,
        String location,
        Boolean online,
        String notes
) {}