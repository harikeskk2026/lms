package com.careerlabs.lms.api.academic.validation;

public final class AcademicValidationMessages {

    public static final String PERCENTAGE_INVALID = "Percentage must be between 0 and 100";
    public static final String CGPA_OR_PERCENTAGE_INVALID = "Score must be between 0 and 100";
    public static final String YEAR_INVALID = "Year of passing must be between 1950 and 2100";
    public static final String BACKLOGS_INVALID = "Backlogs cannot be negative";

    private AcademicValidationMessages() {
    }
}
