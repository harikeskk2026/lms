package com.careerlabs.lms.api.recordedsession.dto.response;

import com.careerlabs.lms.api.recordedsession.entity.PlaybackSession;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSessionStatus;

import java.time.Instant;

public record PlaybackSessionAdminResponse(
        Long id,
        Long studentId,
        String studentName,
        String studentEmail,
        String deviceId,
        Instant startedAt,
        Instant lastActivity,
        Instant endedAt,
        int lastPositionSeconds,
        int watchDurationSeconds,
        int completionPercentage,
        PlaybackSessionStatus status,
        String ipAddress,
        String userAgent
) {

    public static PlaybackSessionAdminResponse from(PlaybackSession session, String studentName, String studentEmail) {
        return new PlaybackSessionAdminResponse(
                session.getId(),
                session.getStudentId(),
                studentName,
                studentEmail,
                session.getDeviceId(),
                session.getStartedAt(),
                session.getLastActivity(),
                session.getEndedAt(),
                session.getLastPositionSeconds(),
                session.getWatchDurationSeconds(),
                session.getCompletionPercentage(),
                session.getStatus(),
                session.getIpAddress(),
                session.getUserAgent());
    }
}
