package com.careerlabs.lms.api.quiz.validation;

import com.careerlabs.lms.api.quiz.dto.request.QuestionOptionRequest;
import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.validation.annotation.ValidQuestionOptions;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;

public class QuestionOptionsValidator implements ConstraintValidator<ValidQuestionOptions, QuestionOptionsAware> {

    @Override
    public boolean isValid(QuestionOptionsAware value, ConstraintValidatorContext context) {
        if (value == null || value.getQuestionType() == null) {
            // @NotNull on questionType already reports the "required" case.
            return true;
        }

        if (value.getAnswerMode() == AnswerMode.FREE_TEXT) {
            // Short Answer / Coding / SQL free-text questions don't use options at
            // all — their correctness lives in correctAnswerText/referenceAnswer.
            return true;
        }

        List<QuestionOptionRequest> options = value.getOptions();
        if (options == null || options.isEmpty()) {
            // OPTIONS-mode questions always need at least one option; there's no
            // longer a field-level @NotEmpty for this (FREE_TEXT questions send none).
            return fail(context, QuestionValidationMessages.OPTIONS_REQUIRED);
        }

        long correctCount = options.stream().filter(QuestionOptionRequest::isCorrect).count();
        QuestionType type = value.getQuestionType();

        if (type == QuestionType.MCQ || type == QuestionType.TRUE_FALSE) {
            if (correctCount != 1) {
                return fail(context, QuestionValidationMessages.OPTIONS_INVALID_MCQ);
            }
        } else if (type == QuestionType.MULTIPLE_CORRECT) {
            if (correctCount < 1) {
                return fail(context, QuestionValidationMessages.OPTIONS_INVALID_MULTI);
            }
        }

        return true;
    }

    private boolean fail(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        return false;
    }
}
