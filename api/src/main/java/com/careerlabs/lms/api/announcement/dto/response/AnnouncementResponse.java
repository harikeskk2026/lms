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

public record AnnouncementResponse(
        Long id,
        String title,
        String body,
        Long batchId,
        List<Long> batchIds,
        boolean isPinned,
        Instant expiresAt,
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
        List<Long> courseIds,
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

    public AnnouncementResponse(
            Long id, String title, String body, Long batchId, boolean isPinned,
            Instant expiresAt, AnnouncementCategory category, AnnouncementStatus status,
            AnnouncementPriority priority, Instant scheduledAt, boolean requiresAcknowledgment,
            boolean allowComments, AnnouncementActionType actionType, Long actionReferenceId,
            String actionLabel, String actionUrl, Long collegeId, Long courseId,
            AudienceRuleType audienceRuleType, Double audienceRuleValue, Long audienceRuleReferenceId,
            String attachmentUrl, String attachmentName, Instant createdAt,
            Boolean viewed, Boolean acknowledged
    ) {
        this(id, title, body, batchId, batchId != null ? List.of(batchId) : List.of(), isPinned, expiresAt,
                category, status, priority, scheduledAt, requiresAcknowledgment, allowComments,
                actionType, actionReferenceId, actionLabel, actionUrl, collegeId, courseId,
                courseId != null ? List.of(courseId) : List.of(),
                audienceRuleType, audienceRuleValue, audienceRuleReferenceId, attachmentUrl,
                attachmentName, createdAt, viewed, acknowledged);
    }

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

        List<Long> batchIds = List.of();
        try { batchIds = a.getBatchIds() != null ? a.getBatchIds() : List.of(); } catch (Exception ignored) {}

        Long collegeId = null;
        try { collegeId = a.getCollege() != null ? a.getCollege().getId() : null; } catch (Exception ignored) {}

        Long courseId = null;
        try { courseId = a.getCourse() != null ? a.getCourse().getId() : null; } catch (Exception ignored) {}

        List<Long> courseIds = List.of();
        try { courseIds = a.getCourseIds() != null ? a.getCourseIds() : List.of(); } catch (Exception ignored) {}

        return new AnnouncementResponse(
                a.getId(),
                renderedTitle,
                renderedBody,
                batchId,
                batchIds,
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
                courseIds,
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
