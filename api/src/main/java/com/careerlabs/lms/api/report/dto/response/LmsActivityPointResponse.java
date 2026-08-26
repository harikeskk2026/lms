package com.careerlabs.lms.api.report.dto.response;

public record LmsActivityPointResponse(
        String period,
        long newStudents,
        long assignmentsCreated,
        long quizAttempts
) {
}
