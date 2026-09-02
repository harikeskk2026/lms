package com.careerlabs.lms.api.attendance.dto.request;

import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import com.careerlabs.lms.api.attendance.validation.AttendanceValidationMessages;
import jakarta.validation.constraints.NotNull;

public class CorrectionReviewRequest {

    @NotNull(message = AttendanceValidationMessages.DECISION_REQUIRED)
    private CorrectionStatus decision;

    private String comment;

    public CorrectionStatus getDecision() {
        return decision;
    }

    public void setDecision(CorrectionStatus decision) {
        this.decision = decision;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
