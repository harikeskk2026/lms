package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.InterviewRoundType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Payload for creating a configured interview round on a drive. */
public record CreateInterviewRoundRequest(
        @NotBlank String name,
        InterviewRoundType roundType,
        @NotNull @Min(1) Integer sequence,
        String description,
        @DecimalMin("0") @DecimalMax("100") Double minimumScore,
        @DecimalMin("0") @DecimalMax("100") Double maxScore,
        @Min(1) @jakarta.validation.constraints.Max(600) Integer durationMinutes,
        Boolean online,
        String locationLink
) {}