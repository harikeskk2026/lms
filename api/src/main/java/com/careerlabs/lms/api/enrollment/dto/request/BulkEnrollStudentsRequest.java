package com.careerlabs.lms.api.enrollment.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BulkEnrollStudentsRequest(
        @NotEmpty(message = "At least one student ID is required")
        List<Long> studentIds,
        @NotNull(message = "Batch is required for enrollment")
        Long batchId
) {
}
