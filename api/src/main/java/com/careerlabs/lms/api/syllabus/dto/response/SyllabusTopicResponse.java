package com.careerlabs.lms.api.syllabus.dto.response;

import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;

public record SyllabusTopicResponse(
        Long id,
        Long moduleId,
        String title,
        int orderIndex
) {

    public static SyllabusTopicResponse from(SyllabusTopic topic) {
        return new SyllabusTopicResponse(topic.getId(), topic.getModule().getId(), topic.getTitle(), topic.getOrderIndex());
    }
}
