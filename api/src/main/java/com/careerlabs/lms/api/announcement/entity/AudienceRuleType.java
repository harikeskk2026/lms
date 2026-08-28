package com.careerlabs.lms.api.announcement.entity;

/** Optional data-based narrowing applied on top of batch/department/college/course targeting. */
public enum AudienceRuleType {
    NONE,
    ATTENDANCE_BELOW,
    ASSIGNMENT_NOT_SUBMITTED,
    PLACEMENT_ELIGIBLE
}
