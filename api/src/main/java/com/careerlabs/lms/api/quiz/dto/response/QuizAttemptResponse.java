package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;

import java.time.Instant;

/**
 * Summary row for "my attempts" listings — no per-question detail (see
 * {@link QuizResultResponse} for that).
 */
public record QuizAttemptResponse(
        Long id,
        Long quizId,
        String quizTitle,
        int attemptNumber,
        Instant startedAt,
        Instant completedAt,
        Integer score,
        Integer totalScore,
        Double accuracy,
        int correctCount,
        int wrongCount,
        int skippedCount,
        Integer timeTaken,
        AttemptStatus status,
        Boolean passed
) {

    public static QuizAttemptResponse from(QuizAttempt attempt) {
        return new QuizAttemptResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getQuiz().getTitle(),
                attempt.getAttemptNumber(),
                attempt.getStartedAt(),
                attempt.getCompletedAt(),
                attempt.getScore(),
                attempt.getTotalScore(),
                attempt.getAccuracy(),
                attempt.getCorrectCount(),
                attempt.getWrongCount(),
                attempt.getSkippedCount(),
                attempt.getTimeTaken(),
                attempt.getStatus(),
                attempt.getPassed());
    }
}
