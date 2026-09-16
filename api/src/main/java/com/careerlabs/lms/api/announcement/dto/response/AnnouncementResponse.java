package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementActionType;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
        String attachmentUrl,
        String attachmentName,
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

    public static AnnouncementResponse from(Announcement a, String renderedTitle, String renderedBody,
                                             Boolean viewed, Boolean acknowledged) {
        Long batchId = null;
        try { batchId = a.getBatch() != null ? a.getBatch().getId() : null; } catch (Exception ignored) {}

        Long collegeId = null;
        try { collegeId = a.getCollege() != null ? a.getCollege().getId() : null; } catch (Exception ignored) {}

        Long courseId = null;
        try { courseId = a.getCourse() != null ? a.getCourse().getId() : null; } catch (Exception ignored) {}

        return new AnnouncementResponse(
                a.getId(),
                renderedTitle,
                renderedBody,
                batchId,
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
                collegeId,
                courseId,
                a.getAudienceRuleType(),
                a.getAudienceRuleValue(),
                a.getAudienceRuleReferenceId(),
                a.getAttachmentUrl(),
                a.getAttachmentName(),
                a.getCreatedAt(),
                viewed,
                acknowledged);
    }
}
