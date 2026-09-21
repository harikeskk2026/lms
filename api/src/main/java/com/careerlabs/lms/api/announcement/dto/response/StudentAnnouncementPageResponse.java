package com.careerlabs.lms.api.announcement.dto.response;

import java.util.List;

/**
 * Server-driven paged shape returned by {@code GET /api/student/announcements}.
 * Follows the {@code items/totalElements/totalPages/page} page-DTO convention used
 * elsewhere in this codebase (1-indexed {@code page}).
 */
public record StudentAnnouncementPageResponse(
        List<AnnouncementResponse> items,
        long totalElements,
        int totalPages,
        int page
) {
}
