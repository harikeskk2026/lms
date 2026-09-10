package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.InterviewResult;
import jakarta.validation.constraints.NotNull;

/** Payload for submitting a structured interview evaluation for a candidate. */
public record CreateEvaluationRequest(
        @NotNull Long interviewId,
        Double technicalScore,
        Double communicationScore,
        Double problemSolvingScore,
        Double codingScore,
        Double domainScore,
        Double overallScore,
        @NotNull InterviewResult recommendation,
        String comments
) {}