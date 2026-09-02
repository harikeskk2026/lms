package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record QuizAnalyticsResponse(
        double overallSkill,
        double accuracy,
        int quizzesCompleted,
        int currentStreak,
        int longestStreak,
        int totalXp,
        List<TopicPerformanceResponse> topicPerformance,
        List<TopicPerformanceResponse> strengths,
        List<WeakAreaResponse> weakAreas,
        List<QuizAttemptResponse> recentAttempts,
        List<ImprovementItem> improvementHistory
) {

    public record ImprovementItem(
            Long quizId,
            String quizTitle,
            double firstScorePct,
            double currentScorePct,
            double improvementPct,
            int attempts
    ) {
    }
}
