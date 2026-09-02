package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionEffectiveStatus;

/** Shared by RecordedSessionService (for display) and PlaybackAuthorizationService (to actually gate playback). */
public interface RecordedSessionAvailabilityService {

    RecordedSessionEffectiveStatus effectiveStatus(RecordedSession session);
}
