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
    public static final String PHONE_INVALID = "Phone number must be exactly 10 digits and start with 6, 7, 8, or 9";
    public static final String PASSWORD_WEAK = "Password must be at least 8 characters and include an uppercase letter, "
            + "a lowercase letter, a number, and a special character, with no spaces";
    public static final String URL_INVALID = "Must be a valid link, not plain text or numbers";

    private ValidationMessages() {
    }
}
