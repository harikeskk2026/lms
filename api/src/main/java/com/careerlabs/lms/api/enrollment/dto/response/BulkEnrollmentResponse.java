package com.careerlabs.lms.api.enrollment.dto.response;

import java.util.List;

public record BulkEnrollmentResponse(
    int totalProcessed,
    int successful,
    int failed,
    List<EnrollmentResultItem> results,
    String message
) {}
