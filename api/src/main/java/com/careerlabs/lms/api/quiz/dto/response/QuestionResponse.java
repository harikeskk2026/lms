package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;

import java.time.Instant;
import java.util.List;

public record QuestionResponse(
        Long id,
        Long topicId,
        String topicName,
        String questionText,
        QuestionType questionType,
        QuizDifficulty difficulty,
        String explanation,
        String codeSnippet,
        Integer points,
        boolean active,
        List<QuestionOptionResponse> options,
        Instant createdAt,
        Instant updatedAt
) {

    public static QuestionResponse from(Question question) {
        return new QuestionResponse(
                question.getId(),
                question.getTopic() != null ? question.getTopic().getId() : null,
                question.getTopic() != null ? question.getTopic().getName() : null,
                question.getQuestionText(),
                question.getQuestionType(),
                question.getDifficulty(),
                question.getExplanation(),
                question.getCodeSnippet(),
                question.getPoints(),
                question.isActive(),
                question.getOptions().stream().map(QuestionOptionResponse::from).toList(),
                question.getCreatedAt(),
                question.getUpdatedAt());
    }
}
