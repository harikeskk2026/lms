package com.careerlabs.lms.api.course.dto.request;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.validation.CourseValidationMessages;
import jakarta.validation.constraints.NotNull;

public class CourseStatusRequest {

    @NotNull(message = CourseValidationMessages.STATUS_REQUIRED)
    private CourseStatus status;

    public CourseStatus getStatus() {
        return status;
    }

    public void setStatus(CourseStatus status) {
        this.status = status;
    }
}
