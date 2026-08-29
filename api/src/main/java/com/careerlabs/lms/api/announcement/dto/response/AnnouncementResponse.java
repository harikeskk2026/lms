package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementActionType;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;

import java.time.Instant;
import java.time.LocalDate;

public record AnnouncementResponse(
        Long id,
        String title,
        String body,
        Long batchId,
        boolean isPinned,
        LocalDate expiresAt,
        AnnouncementCategory category,
        AnnouncementStatus status,
        AnnouncementPriority priority,
        Instant scheduledAt,
        boolean requiresAcknowledgment,
        boolean allowComments,
        AnnouncementActionType actionType,
        Long actionReferenceId,
        String actionLabel,
        String actionUrl,
        Long collegeId,
        Long courseId,
        AudienceRuleType audienceRuleType,
        Double audienceRuleValue,
        Long audienceRuleReferenceId,
        Instant createdAt,
        /** Populated only when rendering for a specific student; null in admin listings. */
        Boolean viewed,
        Boolean acknowledged
) {

    public static AnnouncementResponse from(Announcement a) {
        return from(a, a.getTitle(), a.getBody(), null, null);
    }

    public static AnnouncementResponse from(Announcement a, Boolean viewed, Boolean acknowledged) {
        return from(a, a.getTitle(), a.getBody(), viewed, acknowledged);
    }

    /** Allows callers (e.g. student-facing personalization) to override the rendered title/body. */
    public static AnnouncementResponse from(Announcement a, String renderedTitle, String renderedBody,
                                             Boolean viewed, Boolean acknowledged) {
        return new AnnouncementResponse(
                a.getId(),
                renderedTitle,
                renderedBody,
                a.getBatch() != null ? a.getBatch().getId() : null,
                a.isPinned(),
                a.getExpiresAt(),
                a.getCategory(),
                a.getStatus(),
                a.getPriority(),
                a.getScheduledAt(),
                a.isRequiresAcknowledgment(),
                a.isAllowComments(),
                a.getActionType(),
                a.getActionReferenceId(),
                a.getActionLabel(),
                a.getActionUrl(),
                a.getCollege() != null ? a.getCollege().getId() : null,
                a.getCourse() != null ? a.getCourse().getId() : null,
                a.getAudienceRuleType(),
                a.getAudienceRuleValue(),
                a.getAudienceRuleReferenceId(),
                a.getCreatedAt(),
                viewed,
                acknowledged);
    }
}
