package com.careerlabs.lms.api.placement.dto.response;

import java.util.List;

public record MockInterviewPageResponse(
        List<MockInterviewResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}