package com.careerlabs.lms.api.submission.dto.request;

import com.careerlabs.lms.api.submission.validation.SubmissionValidationMessages;
import jakarta.validation.constraints.Min;

public class GradeSubmissionRequest {

    @Min(value = 0, message = SubmissionValidationMessages.MARKS_MIN)
    private Integer marks;

    private String feedback;

    private Boolean reviewed;

    public Integer getMarks() {
        return marks;
    }

    public void setMarks(Integer marks) {
        this.marks = marks;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public Boolean getReviewed() {
        return reviewed;
    }

    public void setReviewed(Boolean reviewed) {
        this.reviewed = reviewed;
    }
}
