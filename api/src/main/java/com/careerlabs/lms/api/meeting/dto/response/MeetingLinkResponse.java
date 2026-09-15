package com.careerlabs.lms.api.meeting.dto.response;

import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingPlatform;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public record MeetingLinkResponse(
        Long id,
        String title,
        String description,
        String meetUrl,
        MeetingPlatform platform,
        Long batchId,
        String batchName,
        Long courseId,
        String courseTitle,
        Long dailyClassId,
        String hostName,
        LocalDateTime scheduledStart,
        LocalDateTime scheduledEnd,
        MeetingStatus status,
        String passcode,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static MeetingLinkResponse from(MeetingLink m) {
        return from(m, true);
    }

    public static MeetingLinkResponse from(MeetingLink m, boolean includePasscode) {
        return new MeetingLinkResponse(
                m.getId(),
                m.getTitle(),
                m.getDescription(),
                m.getMeetUrl(),
                m.getPlatform(),
                m.getBatch() != null ? m.getBatch().getId() : null,
                m.getBatch() != null ? m.getBatch().getName() : null,
                m.getCourse() != null ? m.getCourse().getId() : null,
                m.getCourse() != null ? m.getCourse().getTitle() : null,
                m.getDailyClass() != null ? m.getDailyClass().getId() : null,
                m.getHostName(),
                m.getScheduledStart(),
                m.getScheduledEnd(),
                m.getStatus(),
                includePasscode ? m.getPasscode() : null,
                m.getCreatedBy(),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
