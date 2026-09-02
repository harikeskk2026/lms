package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.DriveStatus;
import com.careerlabs.lms.api.placement.validation.DriveValidationMessages;
import jakarta.validation.constraints.NotNull;

public class UpdateDriveStatusRequest {

    @NotNull(message = DriveValidationMessages.STATUS_REQUIRED)
    private DriveStatus status;

    public DriveStatus getStatus() {
        return status;
    }

    public void setStatus(DriveStatus status) {
        this.status = status;
    }
}
