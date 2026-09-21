package com.careerlabs.lms.api.placement.dto.response;

import java.util.List;

public record PlacementInterviewPageResponse(
        List<PlacementInterviewResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}