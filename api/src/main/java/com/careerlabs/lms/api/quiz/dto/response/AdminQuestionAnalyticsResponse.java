package com.careerlabs.lms.api.quiz.dto.response;

public record AdminQuestionAnalyticsResponse(
        long attempts,
        long correct,
        long wrong,
        double accuracy,
        double averageTimeSeconds
) {
}
