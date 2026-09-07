package com.careerlabs.lms.api.syllabus.dto.response;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;

import java.util.List;

public record SyllabusTopicResponse(
        Long id,
        Long moduleId,
        String title,
        String description,
        CourseStatus status,
        int orderIndex,
        Integer durationHours,
        List<MaterialResponse> materials
) {

    public SyllabusTopicResponse(Long id, Long moduleId, String title, String description,
                                 CourseStatus status, int orderIndex, Integer durationHours) {
        this(id, moduleId, title, description, status, orderIndex, durationHours, List.of());
    }

    public static SyllabusTopicResponse from(SyllabusTopic topic) {
        return from(topic, List.of());
    }

    public static SyllabusTopicResponse from(SyllabusTopic topic, List<MaterialResponse> materials) {
        return new SyllabusTopicResponse(
                topic.getId(),
                topic.getModule().getId(),
                topic.getTitle(),
                topic.getDescription(),
                topic.getStatus(),
                topic.getOrderIndex(),
                topic.getDurationHours(),
                materials != null ? materials : List.of());
    }
}
