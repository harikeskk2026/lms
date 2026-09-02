package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

public record QuizAnalyticsResponse(
        Double averageScorePct,
        Double passRatePct,
        Double failRatePct,
        long totalAttempts,
        Double averageAttemptsPerStudent,
        List<QuizBreakdown> quizBreakdown
) {

    public record QuizBreakdown(Long quizId, String title, Double averageScorePct, Double passRatePct,
                                 long attempts, String difficultyStatus) {
    }
}
