package com.careerlabs.lms.api.attendance.dto.request;

import com.careerlabs.lms.api.attendance.validation.AttendanceValidationMessages;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class AttendancePolicyRequest {

    private Long batchId;

    private Long courseId;

    @NotNull(message = AttendanceValidationMessages.HEALTHY_THRESHOLD_REQUIRED)
    @Min(value = 1, message = AttendanceValidationMessages.HEALTHY_THRESHOLD_MIN)
    @Max(value = 100, message = AttendanceValidationMessages.HEALTHY_THRESHOLD_MAX)
    private Integer healthyThreshold;

    @NotNull(message = AttendanceValidationMessages.AT_RISK_THRESHOLD_REQUIRED)
    @Min(value = 1, message = AttendanceValidationMessages.AT_RISK_THRESHOLD_MIN)
    @Max(value = 100, message = AttendanceValidationMessages.AT_RISK_THRESHOLD_MAX)
    private Integer atRiskThreshold;

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Integer getHealthyThreshold() {
        return healthyThreshold;
    }

    public void setHealthyThreshold(Integer healthyThreshold) {
        this.healthyThreshold = healthyThreshold;
    }

    public Integer getAtRiskThreshold() {
        return atRiskThreshold;
    }

    public void setAtRiskThreshold(Integer atRiskThreshold) {
        this.atRiskThreshold = atRiskThreshold;
    }
}
