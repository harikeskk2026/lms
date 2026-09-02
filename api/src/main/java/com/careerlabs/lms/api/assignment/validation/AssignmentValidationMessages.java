package com.careerlabs.lms.api.assignment.validation;

public final class AssignmentValidationMessages {

    public static final String TITLE_REQUIRED = "Title is required";
    public static final String TITLE_SIZE = "Title must be between {min} and {max} characters";
    public static final String DESCRIPTION_REQUIRED = "Description is required";
    public static final String COURSE_ID_REQUIRED = "Course is required";
    public static final String BATCH_ID_REQUIRED = "Batch is required";
    public static final String DUE_DATE_REQUIRED = "Due date is required";
    public static final String TOTAL_MARKS_REQUIRED = "Total marks is required";
    public static final String TOTAL_MARKS_MIN = "Total marks must be at least {value}";
    public static final String TOTAL_MARKS_MAX = "Total marks must be at most {value}";

    private AssignmentValidationMessages() {
    }
}
