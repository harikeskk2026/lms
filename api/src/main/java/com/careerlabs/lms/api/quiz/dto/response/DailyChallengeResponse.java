package com.careerlabs.lms.api.quiz.dto.response;

public record DailyChallengeResponse(
        Long quizId,
        String title,
        Integer duration,
        Integer passingScore,
        int totalQuestions,
        boolean attempted,
        Integer rank
) {
}
