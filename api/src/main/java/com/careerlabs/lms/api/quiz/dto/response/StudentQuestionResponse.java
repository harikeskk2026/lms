package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;

import java.util.List;

/**
 * Student-facing question view for an in-progress attempt — no {@code explanation},
 * no {@code points}, and options carry no correct-answer flag (see
 * {@link StudentQuestionOptionResponse}). {@code answerMode} tells the frontend
 * whether to render options or a free-text/code/SQL input; the answer key itself
 * ({@code correctAnswerText}/{@code referenceAnswer}) is never included here.
 */
public record StudentQuestionResponse(
        Long id,
        String topicName,
        String questionText,
        QuestionType questionType,
        AnswerMode answerMode,
        QuizDifficulty difficulty,
        String codeSnippet,
        String answerLanguage,
        List<StudentQuestionOptionResponse> options
) {

    public static StudentQuestionResponse from(Question question, List<StudentQuestionOptionResponse> options) {
        return new StudentQuestionResponse(
                question.getId(),
                question.getTopic() != null ? question.getTopic().getName() : null,
                question.getQuestionText(),
                question.getQuestionType(),
                question.getAnswerMode(),
                question.getDifficulty(),
                question.getCodeSnippet(),
                question.getAnswerLanguage(),
                options);
    }
}
