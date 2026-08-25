package com.careerlabs.lms.api.batch.validation;

public final class BatchValidationMessages {

    public static final String NAME_REQUIRED = "Batch name is required";
    public static final String COURSE_ID_REQUIRED = "Course is required";
    public static final String START_DATE_REQUIRED = "Start date is required";
    public static final String END_DATE_REQUIRED = "End date is required";
    public static final String MODE_REQUIRED = "Mode is required";
    public static final String MAX_STUDENTS_MIN = "Max students must be at least {value}";
    public static final String MAX_STUDENTS_MAX = "Max students must be at most {value}";

    private BatchValidationMessages() {
    }
}
