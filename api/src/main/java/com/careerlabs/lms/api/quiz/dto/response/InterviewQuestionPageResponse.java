package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record InterviewQuestionPageResponse(
        List<InterviewQuestionResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}