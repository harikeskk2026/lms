package com.careerlabs.lms.api.attendance.dto.request;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.validation.AttendanceValidationMessages;
import jakarta.validation.constraints.NotNull;

public class AttendanceEditRequest {

    @NotNull(message = AttendanceValidationMessages.STATUS_REQUIRED)
    private AttendStatus status;

    private String remarks;

    public AttendStatus getStatus() {
        return status;
    }

    public void setStatus(AttendStatus status) {
        this.status = status;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
