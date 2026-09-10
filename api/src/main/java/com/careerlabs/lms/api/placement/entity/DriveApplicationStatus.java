package com.careerlabs.lms.api.placement.entity;

/**
 * Admin-mediated pipeline a student's interest moves through. Students can never
 * jump straight to SELECTED - there is no direct "apply to company" step anywhere.
 * Legal transitions (enforced in DriveApplicationServiceImpl):
 * INTERESTED -> UNDER_REVIEW -> SHORTLISTED -> RESUME_SHARED -> SELECTED | NOT_SELECTED
 * REJECTED is reachable from UNDER_REVIEW or SHORTLISTED.
 * Students may WITHDRAW from INTERESTED, UNDER_REVIEW, SHORTLISTED, or RESUME_SHARED.
 * A SELECTED application progresses to OFFERED -> ACCEPTED (automatically creating a final Placement).
 */
public enum DriveApplicationStatus {
    INTERESTED,
    UNDER_REVIEW,
    SHORTLISTED,
    RESUME_SHARED,
    SELECTED,
    OFFERED,
    ACCEPTED,
    NOT_SELECTED,
    REJECTED,
    WITHDRAWN
}
