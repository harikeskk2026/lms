package com.careerlabs.lms.api.attendance.validation;

public final class AttendanceValidationMessages {

    public static final String TARGET_PERCENTAGE_REQUIRED = "Target percentage is required";
    public static final String TARGET_PERCENTAGE_MIN = "Target percentage must be at least {value}";
    public static final String TARGET_PERCENTAGE_MAX = "Target percentage must be at most {value}";
    public static final String ATTENDANCE_ID_REQUIRED = "Attendance record is required";
    public static final String REQUESTED_STATUS_REQUIRED = "Requested status is required";
    public static final String REASON_REQUIRED = "Reason is required";
    public static final String DECISION_REQUIRED = "Decision is required";
    public static final String STATUS_REQUIRED = "Status is required";
    public static final String HEALTHY_THRESHOLD_REQUIRED = "Healthy threshold is required";
    public static final String HEALTHY_THRESHOLD_MIN = "Healthy threshold must be at least {value}";
    public static final String HEALTHY_THRESHOLD_MAX = "Healthy threshold must be at most {value}";
    public static final String AT_RISK_THRESHOLD_REQUIRED = "At-risk threshold is required";
    public static final String AT_RISK_THRESHOLD_MIN = "At-risk threshold must be at least {value}";
    public static final String AT_RISK_THRESHOLD_MAX = "At-risk threshold must be at most {value}";

    private AttendanceValidationMessages() {
    }
}
