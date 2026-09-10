package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.InterviewEvaluation;

import java.time.Instant;

/** Evaluation of a candidate for a placement interview round. */
public record InterviewEvaluationResponse(
        Long id,
        Long interviewId,
        Long studentId,
        Long evaluatorId,
        String evaluatorName,
        Double technicalScore,
        Double communicationScore,
        Double problemSolvingScore,
        Double codingScore,
        Double domainScore,
        Double overallScore,
        String recommendation,
        String comments,
        Instant createdAt
) {

    public static InterviewEvaluationResponse from(InterviewEvaluation evaluation) {
        return new InterviewEvaluationResponse(
                evaluation.getId(),
                evaluation.getInterview().getId(),
                evaluation.getStudent().getId(),
                evaluation.getEvaluator().getId(),
                evaluation.getEvaluator().getName(),
                evaluation.getTechnicalScore(),
                evaluation.getCommunicationScore(),
                evaluation.getProblemSolvingScore(),
                evaluation.getCodingScore(),
                evaluation.getDomainScore(),
                evaluation.getOverallScore(),
                evaluation.getRecommendation().name(),
                evaluation.getComments(),
                evaluation.getCreatedAt());
    }
}