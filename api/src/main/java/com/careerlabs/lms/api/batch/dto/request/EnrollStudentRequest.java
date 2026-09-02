package com.careerlabs.lms.api.batch.dto.request;

import jakarta.validation.constraints.NotNull;

public record EnrollStudentRequest(
        @NotNull(message = "studentId is required")
        Long studentId
) {
}
