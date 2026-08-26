package com.careerlabs.lms.api.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;

public class CreateQuizTopicRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    private Long parentId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }
}
