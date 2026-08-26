package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.QuestionOption;

/**
 * Student-facing option view for an in-progress attempt — deliberately has no
 * {@code correct} field, so the answer key can never leak before submission.
 */
public record StudentQuestionOptionResponse(
        Long id,
        String optionText
) {

    public static StudentQuestionOptionResponse from(QuestionOption option) {
        return new StudentQuestionOptionResponse(option.getId(), option.getOptionText());
    }
}
