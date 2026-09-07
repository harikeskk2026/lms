package com.careerlabs.lms.api.syllabus.dto.response;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.syllabus.entity.DurationUnit;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;

import java.util.List;

public record SyllabusModuleResponse(
        Long id,
        Long courseId,
        String title,
        String description,
        CourseStatus status,
        int orderIndex,
        Integer durationValue,
        DurationUnit durationUnit,
        List<SyllabusTopicResponse> topics,
        List<MaterialResponse> materials
) {

    public SyllabusModuleResponse(Long id, Long courseId, String title, String description,
                                  CourseStatus status, int orderIndex, Integer durationValue,
                                  DurationUnit durationUnit, List<SyllabusTopicResponse> topics) {
        this(id, courseId, title, description, status, orderIndex, durationValue, durationUnit, topics, List.of());
    }

    public static SyllabusModuleResponse from(SyllabusModule module, List<SyllabusTopicResponse> topics) {
        return from(module, topics, List.of());
    }

    public static SyllabusModuleResponse from(SyllabusModule module, List<SyllabusTopicResponse> topics, List<MaterialResponse> materials) {
        return new SyllabusModuleResponse(
                module.getId(),
                module.getCourse().getId(),
                module.getTitle(),
                module.getDescription(),
                module.getStatus(),
                module.getOrderIndex(),
                module.getDurationValue(),
                module.getDurationUnit(),
                topics != null ? topics : List.of(),
                materials != null ? materials : List.of());
    }
}
