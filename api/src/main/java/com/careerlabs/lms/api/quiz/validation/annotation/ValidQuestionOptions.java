package com.careerlabs.lms.api.quiz.validation.annotation;

import com.careerlabs.lms.api.quiz.validation.QuestionOptionsValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Enforces the correct-option count required by a question's type: exactly one
 * correct option for MCQ/TRUE_FALSE, at least one for MULTIPLE_CORRECT. Other
 * types (free-form CODE_OUTPUT/DEBUGGING/SCENARIO/SQL/INTERVIEW) are unconstrained.
 */
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = QuestionOptionsValidator.class)
public @interface ValidQuestionOptions {

    String message() default "Question options are invalid for the selected question type";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
