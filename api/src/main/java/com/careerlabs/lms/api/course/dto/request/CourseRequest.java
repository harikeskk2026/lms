package com.careerlabs.lms.api.course.dto.request;

import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.validation.CourseValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CourseRequest {

    @NotBlank(message = CourseValidationMessages.TITLE_REQUIRED)
    @Size(min = 3, max = 150, message = CourseValidationMessages.TITLE_SIZE)
    private String title;

    @NotBlank(message = CourseValidationMessages.DESCRIPTION_REQUIRED)
    @Size(max = 5000, message = CourseValidationMessages.DESCRIPTION_SIZE)
    private String description;

    @NotBlank(message = CourseValidationMessages.DURATION_REQUIRED)
    private String duration;

    @NotNull(message = CourseValidationMessages.LEVEL_REQUIRED)
    private Level level;

    private String thumbnail;

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

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public Level getLevel() {
        return level;
    }

    public void setLevel(Level level) {
        this.level = level;
    }

    public String getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(String thumbnail) {
        this.thumbnail = thumbnail;
    }
}
