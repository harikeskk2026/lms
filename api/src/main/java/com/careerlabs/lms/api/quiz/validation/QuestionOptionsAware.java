package com.careerlabs.lms.api.quiz.validation;

import com.careerlabs.lms.api.quiz.dto.request.QuestionOptionRequest;
import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.QuestionType;

import java.util.List;

/**
 * Implemented by any request DTO carrying a {@link QuestionType} + option list pair,
 * so {@link QuestionOptionsValidator} can check them without depending on a specific class.
 */
public interface QuestionOptionsAware {

    QuestionType getQuestionType();

    List<QuestionOptionRequest> getOptions();

    /**
     * Defaults to {@code OPTIONS} so every implementor written before this method
     * existed keeps validating exactly as before.
     */
    default AnswerMode getAnswerMode() {
        return AnswerMode.OPTIONS;
    }
}
