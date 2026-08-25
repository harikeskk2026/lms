package com.careerlabs.lms.api.auth.validation.annotation;

import com.careerlabs.lms.api.auth.validation.EmailFormatValidator;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Stricter email check than {@code @jakarta.validation.constraints.Email}:
 * rejects leading/trailing whitespace and consecutive dots, which the
 * standard annotation allows.
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = EmailFormatValidator.class)
public @interface ValidEmailFormat {

    String message() default "Email format is invalid";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
