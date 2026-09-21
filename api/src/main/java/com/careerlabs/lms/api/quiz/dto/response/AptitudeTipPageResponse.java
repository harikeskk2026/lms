package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record AptitudeTipPageResponse(
        List<AptitudeTipResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}