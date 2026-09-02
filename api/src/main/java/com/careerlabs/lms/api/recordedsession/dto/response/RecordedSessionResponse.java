package com.careerlabs.lms.api.recordedsession.dto.response;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionEffectiveStatus;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Full admin view — includes internal status/processing details never shown to students. */
public record RecordedSessionResponse(
        Long id,
        Long courseId,
        String courseName,
        Long batchId,
        String instructorName,
        String title,
        String description,
        String thumbnailUrl,
        String tags,
        Integer durationSeconds,
        LocalDate sessionDate,
        RecordedSessionStatus status,
        RecordedSessionEffectiveStatus effectiveStatus,
        LocalDateTime availableFrom,
        LocalDateTime availableUntil,
        String processingError,
        String driveFileId,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt
) {

    public static RecordedSessionResponse from(RecordedSession session, String courseName, RecordedSessionEffectiveStatus effectiveStatus) {
        return new RecordedSessionResponse(
                session.getId(),
                session.getCourse().getId(),
                courseName,
                session.getBatchId(),
                session.getInstructorName(),
                session.getTitle(),
                session.getDescription(),
                session.getThumbnailUrl(),
                session.getTags(),
                session.getDurationSeconds(),
                session.getSessionDate(),
                session.getStatus(),
                effectiveStatus,
                session.getAvailableFrom(),
                session.getAvailableUntil(),
                session.getProcessingError(),
                session.getDriveFileId(),
                session.getCreatedBy(),
                session.getCreatedAt(),
                session.getUpdatedAt());
    }
}
