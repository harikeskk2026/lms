package com.careerlabs.lms.api.material.dto.response;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.material.entity.Material;
import com.careerlabs.lms.api.material.entity.MaterialType;

import java.time.Instant;

public record MaterialResponse(
        Long id,
        String title,
        MaterialType type,
        String url,
        String description,
        CourseStatus visibility,
        Long courseId,
        Long moduleId,
        Long topicId,
        Long sessionId,
        int orderIndex,
        Instant createdAt
) {

    public static MaterialResponse from(Material material) {
        return new MaterialResponse(
                material.getId(),
                material.getTitle(),
                material.getType(),
                material.getUrl(),
                material.getDescription(),
                material.getVisibility(),
                material.getCourseId(),
                material.getModuleId(),
                material.getTopicId(),
                material.getSessionId(),
                material.getOrderIndex(),
                material.getCreatedAt());
    }
}
