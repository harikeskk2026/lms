package com.careerlabs.lms.api.syllabus.dto.request;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.syllabus.entity.DurationUnit;
import com.careerlabs.lms.api.syllabus.validation.SyllabusValidationMessages;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SyllabusModuleRequest {

    @NotBlank(message = SyllabusValidationMessages.TITLE_REQUIRED)
    @Size(min = 1, max = 200, message = SyllabusValidationMessages.TITLE_SIZE)
    private String title;

    private String description;

    private CourseStatus status = CourseStatus.PUBLISHED;

    @Min(value = 1, message = "Duration must be at least 1")
    private Integer durationValue;

    private DurationUnit durationUnit;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDurationValue() {
        return durationValue;
    }

    public void setDurationValue(Integer durationValue) {
        this.durationValue = durationValue;
    }

    public DurationUnit getDurationUnit() {
        return durationUnit;
    }

    public void setDurationUnit(DurationUnit durationUnit) {
        this.durationUnit = durationUnit;
    }

    public CourseStatus getStatus() {
        return status;
    }

    public void setStatus(CourseStatus status) {
        this.status = status;
    }
}
