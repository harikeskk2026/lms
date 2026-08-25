package com.careerlabs.lms.api.assignment.dto.response;

import java.util.List;

public record AssignmentPageResponse(
        List<AssignmentResponse> assignments,
        long total,
        int page,
        int totalPages
) {
}
