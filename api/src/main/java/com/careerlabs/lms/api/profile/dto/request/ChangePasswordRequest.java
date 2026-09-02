package com.careerlabs.lms.api.profile.dto.request;

import com.careerlabs.lms.api.profile.validation.ProfileValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordRequest {

    @NotBlank(message = ProfileValidationMessages.CURRENT_PASSWORD_REQUIRED)
    private String currentPassword;

    @NotBlank(message = ProfileValidationMessages.NEW_PASSWORD_REQUIRED)
    @Size(min = 8, message = ProfileValidationMessages.NEW_PASSWORD_SIZE)
    private String newPassword;

    public String getCurrentPassword() {
        return currentPassword;
    }

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
