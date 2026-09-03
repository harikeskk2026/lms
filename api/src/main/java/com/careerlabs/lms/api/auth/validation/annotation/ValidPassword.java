package com.careerlabs.lms.api.auth.validation.annotation;

import com.careerlabs.lms.api.auth.validation.PasswordStrengthValidator;
import com.careerlabs.lms.api.auth.validation.ValidationMessages;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Password strength check, applied only where a NEW password is being set
 * (registration/creation, reset password, change password's newPassword) -
 * never on a field that just verifies an existing password (login, or
 * change-password's currentPassword), since tightening this after the fact
 * would lock out accounts whose existing password predates this rule.
 * A null/blank value is always valid; pair with {@code @NotBlank}.
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordStrengthValidator.class)
public @interface ValidPassword {

    String message() default ValidationMessages.PASSWORD_WEAK;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
