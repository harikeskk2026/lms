package com.careerlabs.lms.api.placement.validation;

public final class DriveValidationMessages {

    public static final String COMPANY_NAME_REQUIRED = "Company name is required";
    public static final String ROLE_REQUIRED = "Role is required";
    public static final String DRIVE_DATE_REQUIRED = "Drive date is required";
    public static final String APPLY_DEADLINE_REQUIRED = "Apply deadline is required";
    public static final String DESCRIPTION_REQUIRED = "Description is required";
    public static final String DRIVE_TYPE_REQUIRED = "Drive type is required";
    public static final String STATUS_REQUIRED = "Status is required";
    public static final String MIN_CGPA_INVALID = "Minimum CGPA must be between 0 and 10";
    public static final String MIN_PERCENTAGE_INVALID = "Minimum percentage must be between 0 and 100";
    public static final String MAX_BACKLOGS_INVALID = "Maximum backlogs must be 0 or greater";
    public static final String MIN_ATTENDANCE_INVALID = "Minimum attendance percentage must be between 0 and 100";
    public static final String APPLY_DEADLINE_AFTER_DRIVE_DATE = "Apply deadline must be on or before the drive date";
    public static final String ELIGIBLE_BATCH_COURSE_MISMATCH =
            "Eligible batch does not belong to any of the selected eligible courses";

    private DriveValidationMessages() {
    }
}
