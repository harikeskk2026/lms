package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record InterviewResourcePageResponse(
        List<InterviewResourceResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}