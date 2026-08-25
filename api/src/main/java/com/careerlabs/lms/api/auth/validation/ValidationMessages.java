package com.careerlabs.lms.api.auth.validation;

/**
 * Central place for validation message text, kept out of the DTOs/annotations
 * so copy changes never require touching request classes.
 */
public final class ValidationMessages {

    public static final String EMAIL_REQUIRED = "Email is required";
    public static final String EMAIL_INVALID = "Email must be a valid email address";
    public static final String PASSWORD_REQUIRED = "Password is required";
    public static final String PASSWORD_SIZE = "Password must be between {min} and {max} characters";

    private ValidationMessages() {
    }
}
