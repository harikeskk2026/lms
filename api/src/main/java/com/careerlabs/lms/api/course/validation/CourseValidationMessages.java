package com.careerlabs.lms.api.course.validation;

public final class CourseValidationMessages {

    public static final String TITLE_REQUIRED = "Title is required";
    public static final String TITLE_SIZE = "Title must be between {min} and {max} characters";
    public static final String DESCRIPTION_REQUIRED = "Description is required";
    public static final String DESCRIPTION_SIZE = "Description must be at most {max} characters";
    public static final String DURATION_REQUIRED = "Duration is required";
    public static final String LEVEL_REQUIRED = "Level is required";

    private CourseValidationMessages() {
    }
}
