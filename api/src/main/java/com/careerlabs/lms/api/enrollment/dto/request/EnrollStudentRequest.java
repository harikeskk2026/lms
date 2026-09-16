package com.careerlabs.lms.api.enrollment.dto.request;

import jakarta.validation.constraints.NotNull;

public record EnrollStudentRequest(
        @NotNull(message = "Student ID is required")
        Long studentId,
        @NotNull(message = "Batch is required for enrollment")
        Long batchId
) {
}
