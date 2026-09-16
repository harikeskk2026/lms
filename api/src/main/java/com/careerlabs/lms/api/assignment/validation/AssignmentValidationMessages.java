package com.careerlabs.lms.api.assignment.validation;

public final class AssignmentValidationMessages {

    public static final String TITLE_REQUIRED = "Title is required";
    public static final String TITLE_SIZE = "Title must be between {min} and {max} characters";
    public static final String DESCRIPTION_REQUIRED = "Description is required";
    public static final String COURSE_ID_REQUIRED = "Course is required";
    public static final String BATCH_ID_REQUIRED = "Batch is required";
    public static final String DUE_DATE_REQUIRED = "Due date is required";
    public static final String TOTAL_MARKS_REQUIRED = "Please enter correct value below 100";
    public static final String TOTAL_MARKS_MIN = "Please enter correct value below 100";
    public static final String TOTAL_MARKS_MAX = "Please enter correct value below 100";

    private AssignmentValidationMessages() {
    }
}
