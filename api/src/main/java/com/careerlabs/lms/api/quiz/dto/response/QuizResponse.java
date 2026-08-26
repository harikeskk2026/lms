package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;

import java.time.Instant;
import java.util.List;

public record QuizResponse(
        Long id,
        String title,
        String description,
        QuizType type,
        QuizDifficulty difficulty,
        Integer duration,
        Integer passingScore,
        Integer maxAttempts,
        boolean randomQuestions,
        boolean randomOptions,
        boolean showExplanation,
        QuizStatus status,
        Long createdBy,
        int totalQuestions,
        List<QuestionResponse> questions,
        Instant createdAt,
        Instant updatedAt
) {

    public static QuizResponse from(Quiz quiz, List<QuestionResponse> questions) {
        return new QuizResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getType(),
                quiz.getDifficulty(),
                quiz.getDuration(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.isRandomQuestions(),
                quiz.isRandomOptions(),
                quiz.isShowExplanation(),
                quiz.getStatus(),
                quiz.getCreatedBy(),
                questions.size(),
                questions,
                quiz.getCreatedAt(),
                quiz.getUpdatedAt());
    }
}
