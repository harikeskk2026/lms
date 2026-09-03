package com.careerlabs.lms.api.auth.validation.annotation;

import com.careerlabs.lms.api.auth.validation.PhoneNumberFormatValidator;
import com.careerlabs.lms.api.auth.validation.ValidationMessages;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A 10-digit Indian mobile number starting with 6, 7, 8, or 9 - no letters,
 * spaces, or other special characters. A null/blank value is always valid
 * (phone is optional everywhere it's used); pair with {@code @NotBlank} on
 * fields where a phone number is actually required.
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PhoneNumberFormatValidator.class)
public @interface ValidPhoneNumber {

    String message() default ValidationMessages.PHONE_INVALID;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
