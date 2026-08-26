package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizType;

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
        int attemptsUsed
) {

    public static StudentQuizResponse from(Quiz quiz, int totalQuestions, int attemptsUsed) {
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
                attemptsUsed);
    }
}
