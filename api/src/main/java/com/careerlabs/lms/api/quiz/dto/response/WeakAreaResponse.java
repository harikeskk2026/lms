package com.careerlabs.lms.api.quiz.dto.response;

public record WeakAreaResponse(
        Long topicId,
        String topicName,
        double accuracy,
        int questionsAttempted
) {

    public static WeakAreaResponse from(TopicPerformanceResponse topic) {
        return new WeakAreaResponse(topic.topicId(), topic.topicName(), topic.accuracy(), topic.questionsAttempted());
    }
}
