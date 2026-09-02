package com.careerlabs.lms.api.profile.validation;

public final class ProfileValidationMessages {

    public static final String NAME_REQUIRED = "Name is required";
    public static final String NAME_SIZE = "Name must be between 2 and 150 characters";
    public static final String CURRENT_PASSWORD_REQUIRED = "Current password is required";
    public static final String NEW_PASSWORD_REQUIRED = "New password is required";
    public static final String NEW_PASSWORD_SIZE = "New password must be at least 8 characters";

    private ProfileValidationMessages() {
    }
}
