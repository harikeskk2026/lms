package com.careerlabs.lms.api.auth.validation.annotation;

import com.careerlabs.lms.api.auth.validation.UrlFormatValidator;
import com.careerlabs.lms.api.auth.validation.ValidationMessages;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A real domain-shaped link (e.g. "linkedin.com/in/x" or "https://github.com/x")
 * - rejects plain numbers or arbitrary text that isn't shaped like a URL. An
 * optional http(s):// scheme is allowed. A null/blank value is always valid
 * (these fields are optional everywhere they're used).
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UrlFormatValidator.class)
public @interface ValidUrl {

    String message() default ValidationMessages.URL_INVALID;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
