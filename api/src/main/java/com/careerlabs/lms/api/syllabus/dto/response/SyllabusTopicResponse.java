package com.careerlabs.lms.api.syllabus.dto.response;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.session.dto.response.SessionResponse;
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
        List<MaterialResponse> materials,
        List<SessionResponse> sessions
) {

    public SyllabusTopicResponse(Long id, Long moduleId, String title, String description,
                                 CourseStatus status, int orderIndex, Integer durationHours,
                                 List<MaterialResponse> materials) {
        this(id, moduleId, title, description, status, orderIndex, durationHours, materials, List.of());
    }

    public SyllabusTopicResponse(Long id, Long moduleId, String title, String description,
                                 CourseStatus status, int orderIndex, Integer durationHours) {
        this(id, moduleId, title, description, status, orderIndex, durationHours, List.of(), List.of());
    }

    public static SyllabusTopicResponse from(SyllabusTopic topic) {
        return from(topic, List.of(), List.of());
    }

    public static SyllabusTopicResponse from(SyllabusTopic topic, List<MaterialResponse> materials) {
        return from(topic, materials, List.of());
    }

    public static SyllabusTopicResponse from(SyllabusTopic topic, List<MaterialResponse> materials, List<SessionResponse> sessions) {
        return new SyllabusTopicResponse(
                topic.getId(),
                topic.getModule().getId(),
                topic.getTitle(),
                topic.getDescription(),
                topic.getStatus(),
                topic.getOrderIndex(),
                topic.getDurationHours(),
                materials != null ? materials : List.of(),
                sessions != null ? sessions : List.of());
    }
}

