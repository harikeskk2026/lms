package com.careerlabs.lms.api.student.validation;

public final class StudentValidationMessages {

    public static final String NAME_REQUIRED = "Name is required";
    public static final String NAME_SIZE = "Name must be between {min} and {max} characters";
    public static final String EMAIL_REQUIRED = "Email is required";
    public static final String EMAIL_INVALID = "Email format is invalid";
    public static final String PASSWORD_REQUIRED = "Password is required";
    public static final String PASSWORD_SIZE = "Password must be between {min} and {max} characters";
    public static final String PLACEMENT_STATUS_REQUIRED = "Placement status is required";

    private StudentValidationMessages() {
    }
}
