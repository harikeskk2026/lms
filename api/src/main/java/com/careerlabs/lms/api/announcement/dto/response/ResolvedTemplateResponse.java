package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;

public record ResolvedTemplateResponse(
        String title,
        String body,
        AnnouncementCategory category,
        AnnouncementPriority priority,
        boolean requiresAcknowledgment
) {
}
