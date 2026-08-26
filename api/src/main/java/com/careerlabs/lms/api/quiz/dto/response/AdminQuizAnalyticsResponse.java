package com.careerlabs.lms.api.quiz.dto.response;

public record AdminQuizAnalyticsResponse(
        long totalAttempts,
        double averageScore,
        double passRate,
        double averageTimeSeconds
) {
}
