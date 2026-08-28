package com.careerlabs.lms.api.recordedsession.entity;

public enum PlaybackEventType {
    PLAY,
    PAUSE,
    SEEK,
    BUFFER,
    COMPLETE,
    DEVICE_CONFLICT,
    TOKEN_REJECTED,
    /** Best-effort client-side detection of the Windows PrintScreen key only — see PlaybackAuthorizationService. */
    CAPTURE_ATTEMPT_DETECTED,
    /** Page Visibility API fired — tab switched or minimized. Not proof of a capture, just a signal. */
    TAB_HIDDEN,
    /** Window lost OS input focus (e.g. the Win+Shift+S overlay). Not proof of a capture, just a signal. */
    WINDOW_BLURRED,
    /** Fullscreen exited unexpectedly during playback. Not proof of a capture, just a signal. */
    FULLSCREEN_EXITED,
    /** Fullscreen entered during playback — logged for parity with FULLSCREEN_EXITED. */
    FULLSCREEN_ENTERED
}
