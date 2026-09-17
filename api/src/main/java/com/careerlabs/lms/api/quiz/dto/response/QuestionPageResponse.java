package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

/**
 * Paginated shape returned by {@code GET /api/admin/questions} only when the caller opts in with
 * {@code page}/{@code limit}. Mirrors the {@code StudentPageResponse} convention used elsewhere
 * in this codebase (1-indexed {@code page}).
 */
public record QuestionPageResponse(
        List<QuestionResponse> questions,
        long total,
        int page,
        int totalPages
) {
}
