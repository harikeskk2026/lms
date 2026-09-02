package com.careerlabs.lms.api.recordedsession.security;

/** Authenticated principal for the stream endpoints — a playback token, not a login session. */
public record PlaybackTokenPrincipal(Long studentUserId, Long recordedSessionId, String deviceId) {
}
