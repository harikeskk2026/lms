package com.careerlabs.lms.api.recordedsession.dto.response;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionEffectiveStatus;

import java.time.LocalDate;

/**
 * Student-facing view — deliberately excludes status internals, processing
 * errors, and any storage/streaming detail. Streaming access is only ever
 * granted via the separate playback-start call, never from this listing.
 */
public record StudentRecordedSessionResponse(
        Long id,
        String courseName,
        String instructorName,
        String title,
        String description,
        String thumbnailUrl,
        Integer durationSeconds,
        LocalDate sessionDate,
        RecordedSessionEffectiveStatus effectiveStatus,
        int watchedPercentage,
        int resumePositionSeconds
) {

    public static StudentRecordedSessionResponse from(RecordedSession session, String courseName,
                                                        RecordedSessionEffectiveStatus effectiveStatus,
                                                        int watchedPercentage, int resumePositionSeconds) {
        return new StudentRecordedSessionResponse(
                session.getId(),
                courseName,
                session.getInstructorName(),
                session.getTitle(),
                session.getDescription(),
                session.getThumbnailUrl(),
                session.getDurationSeconds(),
                session.getSessionDate(),
                effectiveStatus,
                watchedPercentage,
                resumePositionSeconds);
    }
}
