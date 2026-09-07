package com.careerlabs.lms.api.material.dto.request;

import com.careerlabs.lms.api.material.entity.MaterialType;
import com.careerlabs.lms.api.material.entity.MaterialVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class MaterialRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull(message = "Type is required")
    private MaterialType type;

    @NotBlank(message = "URL is required")
    private String url;

    private String description;

    private MaterialVisibility visibility = MaterialVisibility.PUBLISHED;

    private Long courseId;

    private Long moduleId;

    private Long topicId;

    private Long sessionId;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public MaterialType getType() {
        return type;
    }

    public void setType(MaterialType type) {
        this.type = type;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public MaterialVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(MaterialVisibility visibility) {
        this.visibility = visibility;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Long getModuleId() {
        return moduleId;
    }

    public void setModuleId(Long moduleId) {
        this.moduleId = moduleId;
    }

    public Long getTopicId() {
        return topicId;
    }

    public void setTopicId(Long topicId) {
        this.topicId = topicId;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }
}
