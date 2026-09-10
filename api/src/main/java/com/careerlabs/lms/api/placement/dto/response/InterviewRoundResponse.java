package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.InterviewRound;

import java.time.Instant;

/** Admin-facing view of an interview round configured for a drive. */
public record InterviewRoundResponse(
        Long id,
        Long driveId,
        String name,
        String roundType,
        Integer sequence,
        String description,
        Double minimumScore,
        Double maxScore,
        Integer durationMinutes,
        Boolean online,
        String locationLink,
        Instant createdAt
) {

    public static InterviewRoundResponse from(InterviewRound round) {
        return new InterviewRoundResponse(
                round.getId(),
                round.getDrive().getId(),
                round.getName(),
                round.getRoundType().name(),
                round.getSequence(),
                round.getDescription(),
                round.getMinimumScore(),
                round.getMaxScore(),
                round.getDurationMinutes(),
                round.getOnline(),
                round.getLocationLink(),
                round.getCreatedAt());
    }
}