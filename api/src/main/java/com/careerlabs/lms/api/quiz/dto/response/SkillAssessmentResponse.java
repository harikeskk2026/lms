package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record SkillAssessmentResponse(
        double overallSkill,
        String level,
        List<String> strongTopics,
        List<String> weakTopics,
        List<TopicPerformanceResponse> topicBreakdown
) {

    /** 0-39 BEGINNER, 40-69 INTERMEDIATE, 70-89 ADVANCED, 90-100 EXPERT. */
    public static String levelFor(double overallSkill) {
        if (overallSkill >= 90) return "EXPERT";
        if (overallSkill >= 70) return "ADVANCED";
        if (overallSkill >= 40) return "INTERMEDIATE";
        return "BEGINNER";
    }
}
