package com.careerlabs.lms.api.attendance.dto.request;

import com.careerlabs.lms.api.attendance.validation.AttendanceValidationMessages;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class AttendanceGoalRequest {

    @NotNull(message = AttendanceValidationMessages.TARGET_PERCENTAGE_REQUIRED)
    @Min(value = 50, message = AttendanceValidationMessages.TARGET_PERCENTAGE_MIN)
    @Max(value = 100, message = AttendanceValidationMessages.TARGET_PERCENTAGE_MAX)
    private Integer targetPercentage;

    public Integer getTargetPercentage() {
        return targetPercentage;
    }

    public void setTargetPercentage(Integer targetPercentage) {
        this.targetPercentage = targetPercentage;
    }
}
