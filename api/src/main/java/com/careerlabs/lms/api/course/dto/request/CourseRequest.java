package com.careerlabs.lms.api.course.dto.request;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.validation.CourseValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CourseRequest {

    @NotBlank(message = CourseValidationMessages.TITLE_REQUIRED)
    @Size(min = 3, max = 150, message = CourseValidationMessages.TITLE_SIZE)
    private String title;

    private String slug;

    private String courseCode;

    @NotBlank(message = CourseValidationMessages.DESCRIPTION_REQUIRED)
    @Size(max = 5000, message = CourseValidationMessages.DESCRIPTION_SIZE)
    private String description;

    @NotBlank(message = CourseValidationMessages.DURATION_REQUIRED)
    private String duration;

    @NotNull(message = CourseValidationMessages.LEVEL_REQUIRED)
    private Level level;

    private String thumbnail;

    @NotNull(message = CourseValidationMessages.STATUS_REQUIRED)
    private CourseStatus status;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
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

    public CourseStatus getStatus() {
        return status;
    }

    public void setStatus(CourseStatus status) {
        this.status = status;
    }
}
