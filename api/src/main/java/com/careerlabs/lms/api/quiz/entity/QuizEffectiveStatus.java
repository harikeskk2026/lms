package com.careerlabs.lms.api.quiz.entity;

/**
 * Derived, never-persisted view of a quiz's real-world availability, computed from
 * {@link QuizStatus} plus {@code scheduledStart}/{@code scheduledEnd} on every read —
 * so admins never have to manually flip status when a schedule opens or closes.
 */
public enum QuizEffectiveStatus {
    DRAFT,
    SCHEDULED,
    LIVE,
    COMPLETED,
    ARCHIVED
}
