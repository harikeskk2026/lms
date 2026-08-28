package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.recordedsession.dto.request.PlaybackStartRequest;
import com.careerlabs.lms.api.recordedsession.dto.response.AuditLogResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.BlockedStudentResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.PlaybackSessionAdminResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.PlaybackStartResponse;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackEventType;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSession;

import java.util.List;

public interface PlaybackAuthorizationService {

    PlaybackStartResponse startPlayback(Long studentUserId, Long recordedSessionId, PlaybackStartRequest request,
                                         String ipAddress, String userAgent);

    void heartbeat(Long playbackSessionId, Long studentUserId, int positionSeconds);

    void end(Long playbackSessionId, Long studentUserId);

    /**
     * Records a client-reported capture attempt (currently: the Windows
     * PrintScreen key only) for the audit trail. This is logged after the
     * fact — the capture itself already happened at the OS level and cannot
     * be prevented; this exists so a leak can be cross-referenced against who
     * was watching and when.
     */
    void recordCaptureAttempt(Long playbackSessionId, Long studentUserId, Integer positionSeconds);

    /**
     * Records a low-severity client-reported UI signal (tab hidden, window
     * blurred, fullscreen exited). Restricted to a safe allow-list of event
     * types — none of these are proof of an actual capture, just signals an
     * admin may want to review.
     */
    void recordClientEvent(Long playbackSessionId, Long studentUserId, PlaybackEventType eventType, Integer positionSeconds);

    /**
     * Re-validated on every manifest/segment/key request: the playback token's
     * signature/expiry is already checked by the filter, but a REVOKED session
     * must stop streaming immediately, not just once its token expires.
     */
    PlaybackSession requireActiveSession(Long studentUserId, Long recordedSessionId, String deviceId);

    /** Admin view of every playback session recorded against a session, most recent first. */
    List<PlaybackSessionAdminResponse> listPlaybackSessions(Long recordedSessionId);

    /** Admin view of the authorization-decision audit trail for a session, most recent first. */
    List<AuditLogResponse> listAuditLog(Long recordedSessionId);

    /** Admin-triggered kill switch for one active playback session — takes effect on its next request. */
    void revokeSession(Long playbackSessionId);

    /** Admin-triggered kill switch for every active playback session belonging to a student, across all recorded sessions. */
    void revokeAllForStudent(Long studentUserId);

    /** Bars a specific enrolled student from this one recorded session (course enrollment untouched) and revokes any active session. */
    void blockStudent(Long recordedSessionId, Long studentUserId, Long blockedByAdminUserId);

    void unblockStudent(Long recordedSessionId, Long studentUserId);

    List<BlockedStudentResponse> listBlockedStudents(Long recordedSessionId);
}
