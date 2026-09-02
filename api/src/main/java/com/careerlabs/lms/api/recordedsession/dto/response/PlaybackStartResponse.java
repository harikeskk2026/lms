package com.careerlabs.lms.api.recordedsession.dto.response;

public record PlaybackStartResponse(
        Long playbackSessionId,
        String playbackToken,
        long expiresIn,
        String manifestUrl,
        int resumePositionSeconds
) {
}
