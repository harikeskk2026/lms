package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.QuizTopic;

public record QuizTopicResponse(
        Long id,
        String name,
        String description,
        Long parentId
) {

    public static QuizTopicResponse from(QuizTopic topic) {
        return new QuizTopicResponse(topic.getId(), topic.getName(), topic.getDescription(), topic.getParentId());
    }
}
