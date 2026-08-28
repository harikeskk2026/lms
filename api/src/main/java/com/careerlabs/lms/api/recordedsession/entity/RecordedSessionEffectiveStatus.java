package com.careerlabs.lms.api.recordedsession.entity;

/**
 * Derived, never-persisted view — {@code PUBLISHED} splits into SCHEDULED/LIVE/EXPIRED
 * based on {@code availableFrom}/{@code availableUntil}, mirroring the same
 * derived-status approach already used for {@code QuizEffectiveStatus}.
 */
public enum RecordedSessionEffectiveStatus {
    DRAFT,
    PROCESSING,
    READY,
    SCHEDULED,
    LIVE,
    EXPIRED,
    ARCHIVED,
    FAILED
}
