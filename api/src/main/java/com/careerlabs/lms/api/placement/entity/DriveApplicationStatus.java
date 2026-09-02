package com.careerlabs.lms.api.placement.entity;

/**
 * Admin-mediated pipeline a student's interest moves through. Students can never
 * jump straight to SELECTED - there is no direct "apply to company" step anywhere.
 * Legal transitions (enforced in DriveApplicationServiceImpl):
 * INTERESTED -&gt; UNDER_REVIEW -&gt; SHORTLISTED -&gt; RESUME_SHARED -&gt; SELECTED | NOT_SELECTED
 * REJECTED is reachable from UNDER_REVIEW or SHORTLISTED.
 */
public enum DriveApplicationStatus {
    INTERESTED,
    UNDER_REVIEW,
    SHORTLISTED,
    RESUME_SHARED,
    SELECTED,
    NOT_SELECTED,
    REJECTED
}
