package com.careerlabs.lms.api.announcement.dto.request;

import com.careerlabs.lms.api.announcement.entity.AnnouncementActionType;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.time.LocalDate;

public record AnnouncementRequest(
        @NotBlank(message = "title is required")
        String title,

        @NotBlank(message = "body is required")
        String body,

        /** Null means "all students" (subject to the other targeting filters below). */
        Long batchId,

        boolean isPinned,

        LocalDate expiresAt,

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

        /** Null defaults to NONE. */
        AudienceRuleType audienceRuleType,
        Double audienceRuleValue,
        Long audienceRuleReferenceId
) {
}
