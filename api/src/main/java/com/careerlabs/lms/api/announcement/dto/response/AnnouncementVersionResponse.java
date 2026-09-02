package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementVersion;

import java.time.Instant;

public record AnnouncementVersionResponse(
        Long id,
        int versionNumber,
        String title,
        String content,
        AnnouncementCategory category,
        AnnouncementPriority priority,
        String changedByName,
        Instant changedAt
) {

    public static AnnouncementVersionResponse from(AnnouncementVersion v) {
        return new AnnouncementVersionResponse(
                v.getId(), v.getVersionNumber(), v.getTitle(), v.getContent(), v.getCategory(), v.getPriority(),
                v.getChangedBy() != null ? v.getChangedBy().getName() : null, v.getChangedAt());
    }
}
