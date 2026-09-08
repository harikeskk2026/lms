package com.careerlabs.lms.api.enrollment.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BulkEnrollStudentsRequest(
        @NotEmpty(message = "At least one student ID is required")
        List<Long> studentIds,
        Long batchId
) {
}
