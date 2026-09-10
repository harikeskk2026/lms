package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.InterviewRoundType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Payload for creating a configured interview round on a drive. */
public record CreateInterviewRoundRequest(
        @NotBlank String name,
        InterviewRoundType roundType,
        @NotNull Integer sequence,
        String description,
        Double minimumScore,
        Double maxScore,
        Integer durationMinutes,
        Boolean online,
        String locationLink
) {}