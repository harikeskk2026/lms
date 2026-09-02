package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.placement.validation.DriveValidationMessages;
import jakarta.validation.constraints.NotNull;

public class UpdateDriveApplicationStatusRequest {

    @NotNull(message = DriveValidationMessages.STATUS_REQUIRED)
    private DriveApplicationStatus status;

    private String note;

    public DriveApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(DriveApplicationStatus status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
