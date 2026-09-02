package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.QuestionOption;

/**
 * Admin-facing option view — includes {@code correct}. Never return this to a student
 * before they've submitted their attempt; use {@link StudentQuestionOptionResponse} instead.
 */
public record QuestionOptionResponse(
        Long id,
        String optionText,
        boolean correct,
        int orderIndex
) {

    public static QuestionOptionResponse from(QuestionOption option) {
        return new QuestionOptionResponse(option.getId(), option.getOptionText(), option.isCorrect(),
                option.getOrderIndex());
    }
}
