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
        Boolean passed,
        boolean resultsPending
) {

    /**
     * @param resultsPending when true (the quiz's result-visibility rule hasn't
     *                       released this attempt's outcome yet), every scoring
     *                       field is nulled out — same gating as {@link QuizResultResponse}.
     */
    public static QuizAttemptResponse from(QuizAttempt attempt, boolean resultsPending) {
        boolean revealScoring = attempt.getStatus() == AttemptStatus.SUBMITTED && !resultsPending;
        return new QuizAttemptResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getQuiz().getTitle(),
                attempt.getAttemptNumber(),
                attempt.getStartedAt(),
                attempt.getCompletedAt(),
                revealScoring ? attempt.getScore() : null,
                attempt.getTotalScore(),
                revealScoring ? attempt.getAccuracy() : null,
                revealScoring ? attempt.getCorrectCount() : 0,
                revealScoring ? attempt.getWrongCount() : 0,
                revealScoring ? attempt.getSkippedCount() : 0,
                attempt.getTimeTaken(),
                attempt.getStatus(),
                revealScoring ? attempt.getPassed() : null,
                attempt.getStatus() == AttemptStatus.SUBMITTED && resultsPending);
    }
}
