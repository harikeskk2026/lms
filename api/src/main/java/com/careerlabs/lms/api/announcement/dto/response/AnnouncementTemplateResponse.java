package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementTemplate;

import java.time.Instant;

public record AnnouncementTemplateResponse(
        Long id,
        String name,
        AnnouncementCategory category,
        String titleTemplate,
        String contentTemplate,
        AnnouncementPriority priority,
        boolean requiresAcknowledgment,
        Instant createdAt
) {

    public static AnnouncementTemplateResponse from(AnnouncementTemplate t) {
        return new AnnouncementTemplateResponse(
                t.getId(), t.getName(), t.getCategory(), t.getTitleTemplate(), t.getContentTemplate(),
                t.getPriority(), t.isRequiresAcknowledgment(), t.getCreatedAt());
    }
}
