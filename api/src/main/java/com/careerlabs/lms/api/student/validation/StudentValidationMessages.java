package com.careerlabs.lms.api.student.validation;

public final class StudentValidationMessages {

    public static final String NAME_REQUIRED = "Name is required";
    public static final String NAME_SIZE = "Name must be between {min} and {max} characters";
    public static final String EMAIL_REQUIRED = "Email is required";
    public static final String EMAIL_INVALID = "Email format is invalid";
    public static final String PASSWORD_REQUIRED = "Password is required";
    public static final String PASSWORD_SIZE = "Password must be between {min} and {max} characters";
    public static final String PLACEMENT_STATUS_REQUIRED = "Placement status is required";
    public static final String ACADEMIC_SCORE_INVALID = "Academic score must be between 0 and 100";
    public static final String PASSED_OUT_YEAR_INVALID = "Passed out year must be between 1950 and 2100";

    private StudentValidationMessages() {
    }
}
