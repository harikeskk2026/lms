package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;

public record AnnouncementSuggestionResponse(
        String title,
        String body,
        AnnouncementCategory category,
        Long batchId,
        String batchName,
        String reason
) {
}
