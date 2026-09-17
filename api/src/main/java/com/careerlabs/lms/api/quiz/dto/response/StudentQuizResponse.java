package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizEffectiveStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.entity.ResultVisibility;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Student-facing quiz view — deliberately excludes the question list and any
 * answer-key data. Questions are only revealed via the start-attempt response.
 */
public record StudentQuizResponse(
        Long id,
        String title,
        String description,
        QuizType type,
        QuizDifficulty difficulty,
        Integer duration,
        Integer passingScore,
        Integer maxAttempts,
        int totalQuestions,
        int attemptsUsed,
        LocalDateTime scheduledStart,
        LocalDateTime scheduledEnd,
        QuizEffectiveStatus effectiveStatus,
        ResultVisibility resultVisibility,
        Instant createdAt,
        Instant updatedAt
) {

    public static StudentQuizResponse from(Quiz quiz, int totalQuestions, int attemptsUsed) {
        return from(quiz, totalQuestions, attemptsUsed, QuizEffectiveStatus.LIVE);
    }

    public static StudentQuizResponse from(Quiz quiz, int totalQuestions, int attemptsUsed, QuizEffectiveStatus effectiveStatus) {
        return new StudentQuizResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getType(),
                quiz.getDifficulty(),
                quiz.getDuration(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                totalQuestions,
                attemptsUsed,
                quiz.getScheduledStart(),
                quiz.getScheduledEnd(),
                effectiveStatus,
                quiz.getResultVisibility(),
                quiz.getCreatedAt(),
                quiz.getUpdatedAt());
    }
}
