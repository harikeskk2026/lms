package com.careerlabs.lms.api.course.validation;

public final class CourseValidationMessages {

    public static final String TITLE_REQUIRED = "Title is required";
    public static final String TITLE_SIZE = "Title must be between {min} and {max} characters";
    public static final String DESCRIPTION_REQUIRED = "Description is required";
    public static final String DESCRIPTION_SIZE = "Description must be at most {max} characters";
    public static final String DURATION_REQUIRED = "Duration is required";
    public static final String DURATION_INVALID = "Duration must be in format '<number> <unit>' where unit is days, weeks, months, or years";
    public static final String LEVEL_REQUIRED = "Level is required";
    public static final String STATUS_REQUIRED = "Status is required";

    private CourseValidationMessages() {
    }
}
