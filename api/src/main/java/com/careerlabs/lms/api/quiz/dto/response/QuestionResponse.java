package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;

import java.time.Instant;
import java.util.List;

public record QuestionResponse(
        Long id,
        Long topicId,
        String topicName,
        Long courseId,
        String courseName,
        String questionText,
        QuestionType questionType,
        AnswerMode answerMode,
        QuizDifficulty difficulty,
        String explanation,
        String codeSnippet,
        String correctAnswerText,
        String referenceAnswer,
        String answerLanguage,
        Integer points,
        boolean active,
        List<QuestionOptionResponse> options,
        Instant createdAt,
        Instant updatedAt
) {

    public static QuestionResponse from(Question question) {
        return from(question, null);
    }

    /**
     * Same as {@link #from(Question)}, but reports {@code points} as the given
     * per-quiz marks override when set — used when a question is rendered inside
     * a specific quiz's context, without touching the bank question's own points.
     */
    public static QuestionResponse from(Question question, Integer marksOverride) {
        return new QuestionResponse(
                question.getId(),
                question.getTopic() != null ? question.getTopic().getId() : null,
                question.getTopic() != null ? question.getTopic().getName() : null,
                question.getCourse() != null ? question.getCourse().getId() : null,
                question.getCourse() != null ? question.getCourse().getTitle() : null,
                question.getQuestionText(),
                question.getQuestionType(),
                question.getAnswerMode(),
                question.getDifficulty(),
                question.getExplanation(),
                question.getCodeSnippet(),
                question.getCorrectAnswerText(),
                question.getReferenceAnswer(),
                question.getAnswerLanguage(),
                marksOverride != null ? marksOverride : question.getPoints(),
                question.isActive(),
                question.getOptions().stream().map(QuestionOptionResponse::from).toList(),
                question.getCreatedAt(),
                question.getUpdatedAt());
    }
}
