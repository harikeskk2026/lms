package com.careerlabs.lms.api.syllabus.dto.request;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import jakarta.validation.constraints.NotNull;

public class SyllabusStatusRequest {

    @NotNull(message = "Status is required")
    private CourseStatus status;

    private boolean includeTopics = true;

    public CourseStatus getStatus() {
        return status;
    }

    public void setStatus(CourseStatus status) {
        this.status = status;
    }

    public boolean isIncludeTopics() {
        return includeTopics;
    }

    public void setIncludeTopics(boolean includeTopics) {
        this.includeTopics = includeTopics;
    }
}
