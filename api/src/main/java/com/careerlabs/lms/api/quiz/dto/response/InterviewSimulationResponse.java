package com.careerlabs.lms.api.quiz.dto.response;

public record InterviewSimulationResponse(
        double technicalKnowledge,
        double problemSolving,
        double accuracy,
        double speedScore,
        double interviewReadiness,
        String readinessLevel
) {

    /** 0-39 NOT_READY, 40-59 DEVELOPING, 60-79 READY, 80-100 HIGHLY_READY. */
    public static String levelFor(double readiness) {
        if (readiness >= 80) return "HIGHLY_READY";
        if (readiness >= 60) return "READY";
        if (readiness >= 40) return "DEVELOPING";
        return "NOT_READY";
    }
}
