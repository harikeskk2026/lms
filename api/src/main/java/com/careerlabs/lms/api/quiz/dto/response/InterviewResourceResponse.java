package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.InterviewResource;

import java.time.Instant;

public record InterviewResourceResponse(
        Long id,
        String title,
        String description,
        String url,
        String tag,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static InterviewResourceResponse from(InterviewResource resource) {
        return new InterviewResourceResponse(
                resource.getId(), resource.getTitle(), resource.getDescription(),
                resource.getUrl(), resource.getTag(),
                resource.isActive(), resource.getCreatedAt(), resource.getUpdatedAt());
    }
}