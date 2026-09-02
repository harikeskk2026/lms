package com.careerlabs.lms.api.syllabus.dto.response;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;

public record SyllabusTopicResponse(
        Long id,
        Long moduleId,
        String title,
        String description,
        CourseStatus status,
        int orderIndex
) {

    public static SyllabusTopicResponse from(SyllabusTopic topic) {
        return new SyllabusTopicResponse(topic.getId(), topic.getModule().getId(), topic.getTitle(),
                topic.getDescription(), topic.getStatus(), topic.getOrderIndex());
    }
}
