package com.careerlabs.lms.api.announcement.dto.request;

import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import jakarta.validation.constraints.NotBlank;

public record AnnouncementTemplateRequest(
        @NotBlank(message = "name is required")
        String name,

        AnnouncementCategory category,

        @NotBlank(message = "titleTemplate is required")
        String titleTemplate,

        @NotBlank(message = "contentTemplate is required")
        String contentTemplate,

        AnnouncementPriority priority,

        boolean requiresAcknowledgment
) {
}
