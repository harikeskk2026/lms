package com.careerlabs.lms.api.submission.dto.request;

import jakarta.validation.constraints.NotBlank;

public class ApproveRejectSubmissionRequest {

    @NotBlank(message = "Action is required (APPROVE or REJECT)")
    private String action;

    private String reason;

    public ApproveRejectSubmissionRequest() {
    }

    public ApproveRejectSubmissionRequest(String action, String reason) {
        this.action = action;
        this.reason = reason;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
