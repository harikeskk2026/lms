package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.InterviewResult;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Payload for submitting a structured interview evaluation for a candidate. */
public record CreateEvaluationRequest(
        @NotNull Long interviewId,
        @DecimalMin("0") @DecimalMax("100") Double technicalScore,
        @DecimalMin("0") @DecimalMax("100") Double communicationScore,
        @DecimalMin("0") @DecimalMax("100") Double problemSolvingScore,
        @DecimalMin("0") @DecimalMax("100") Double codingScore,
        @DecimalMin("0") @DecimalMax("100") Double domainScore,
        @DecimalMin("0") @DecimalMax("100") Double overallScore,
        @NotNull InterviewResult recommendation,
        String comments
) {}