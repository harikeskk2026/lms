package com.careerlabs.lms.api.quiz.entity;

public enum AttemptStatus {
    IN_PROGRESS,
    SUBMITTED,
    /** Started (and so already counted against maxAttempts) but abandoned before
     *  submission or timeout - e.g. the student exited or closed the quiz early.
     *  Never resumable. */
    INCOMPLETE
}
