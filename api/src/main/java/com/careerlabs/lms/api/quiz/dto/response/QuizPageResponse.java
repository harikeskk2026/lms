package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

/**
 * Paginated shape returned by {@code GET /api/admin/quizzes}. Mirrors the
 * {@code QuestionPageResponse}/{@code StudentPageResponse} conventions used
 * elsewhere in this codebase (1-indexed {@code page}).
 */
public record QuizPageResponse(
        List<QuizResponse> quizzes,
        long totalElements,
        int totalPages,
        int page
) {
}