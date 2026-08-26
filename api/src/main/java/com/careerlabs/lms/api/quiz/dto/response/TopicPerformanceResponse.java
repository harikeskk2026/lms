package com.careerlabs.lms.api.quiz.dto.response;

public record TopicPerformanceResponse(
        Long topicId,
        String topicName,
        int questionsAttempted,
        int correctCount,
        double accuracy,
        String level
) {

    /** 80-100 = STRONG, 60-79 = GOOD, 40-59 = AVERAGE, 0-39 = WEAK. */
    public static String levelFor(double accuracy) {
        if (accuracy >= 80) return "STRONG";
        if (accuracy >= 60) return "GOOD";
        if (accuracy >= 40) return "AVERAGE";
        return "WEAK";
    }
}
