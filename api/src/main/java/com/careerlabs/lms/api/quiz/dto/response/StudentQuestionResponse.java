package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;

import java.util.List;

/**
 * Student-facing question view for an in-progress attempt — no {@code explanation},
 * no {@code points}, and options carry no correct-answer flag (see
 * {@link StudentQuestionOptionResponse}).
 */
public record StudentQuestionResponse(
        Long id,
        String topicName,
        String questionText,
        QuestionType questionType,
        QuizDifficulty difficulty,
        String codeSnippet,
        List<StudentQuestionOptionResponse> options
) {

    public static StudentQuestionResponse from(Question question, List<StudentQuestionOptionResponse> options) {
        return new StudentQuestionResponse(
                question.getId(),
                question.getTopic() != null ? question.getTopic().getName() : null,
                question.getQuestionText(),
                question.getQuestionType(),
                question.getDifficulty(),
                question.getCodeSnippet(),
                options);
    }
}
