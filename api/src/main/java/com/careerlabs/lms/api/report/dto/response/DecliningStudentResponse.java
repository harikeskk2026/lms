package com.careerlabs.lms.api.report.dto.response;

public record DecliningStudentResponse(
        Long studentId,
        String studentName,
        String batchName,
        Double currentScorePct,
        Double previousScorePct,
        Double changePct,
        String status
) {
}
