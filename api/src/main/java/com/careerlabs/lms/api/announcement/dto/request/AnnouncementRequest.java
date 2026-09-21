package com.careerlabs.lms.api.announcement.dto.request;

import com.careerlabs.lms.api.announcement.entity.AnnouncementActionType;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AnnouncementRequest(
        @NotBlank(message = "title is required")
        String title,

        @NotBlank(message = "body is required")
        String body,

        /** Null means "all students" (subject to the other targeting filters below). */
        Long batchId,
        List<Long> batchIds,

        boolean isPinned,

        Instant expiresAt,

        /** Null defaults to GENERAL. */
        AnnouncementCategory category,

        /** Null defaults to PUBLISHED on create, or keeps the existing status on update. */
        AnnouncementStatus status,

        /** Null defaults to NORMAL. */
        AnnouncementPriority priority,

        /** Required when status = SCHEDULED. */
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

        /** Null defaults to NONE. */
        AudienceRuleType audienceRuleType,
        Double audienceRuleValue,
        Long audienceRuleReferenceId,
        String attachmentUrl,
        String attachmentName
) {
    public AnnouncementRequest(
            String title, String body, Long batchId, boolean isPinned, Instant expiresAt,
            AnnouncementCategory category, AnnouncementStatus status, AnnouncementPriority priority,
            Instant scheduledAt, boolean requiresAcknowledgment, boolean allowComments,
            AnnouncementActionType actionType, Long actionReferenceId, String actionLabel, String actionUrl,
            Long collegeId, Long courseId, AudienceRuleType audienceRuleType, Double audienceRuleValue,
            Long audienceRuleReferenceId, String attachmentUrl, String attachmentName
    ) {
        this(title, body, batchId, batchId != null ? List.of(batchId) : List.of(),
                isPinned, expiresAt, category, status, priority, scheduledAt,
                requiresAcknowledgment, allowComments, actionType, actionReferenceId, actionLabel, actionUrl,
                collegeId, courseId, courseId != null ? List.of(courseId) : List.of(),
                audienceRuleType, audienceRuleValue, audienceRuleReferenceId, attachmentUrl, attachmentName);
    }

    public List<Long> resolveBatchIds() {
        if (batchIds != null && !batchIds.isEmpty()) {
            return batchIds;
        }
        return batchId != null ? List.of(batchId) : List.of();
    }

    public List<Long> resolveCourseIds() {
        if (courseIds != null && !courseIds.isEmpty()) {
            return courseIds;
        }
        return courseId != null ? List.of(courseId) : List.of();
    }
}
