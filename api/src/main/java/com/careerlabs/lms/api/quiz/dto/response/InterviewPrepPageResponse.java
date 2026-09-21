package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record InterviewPrepPageResponse(
        List<InterviewQuestionResponse> questions,
        long total,
        List<InterviewCategoryCount> categories,
        int totalPages,
        int page
) {
}
