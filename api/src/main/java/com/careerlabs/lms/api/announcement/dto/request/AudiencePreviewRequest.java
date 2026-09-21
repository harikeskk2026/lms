package com.careerlabs.lms.api.announcement.dto.request;

import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;

import java.util.List;

/**
 * Targeting selection used to estimate how many students a new/updated
 * announcement would reach, without persisting anything.
 */
public record AudiencePreviewRequest(
        Long batchId,
        List<Long> batchIds,
        Long collegeId,
        Long courseId,
        List<Long> courseIds,
        AudienceRuleType audienceRuleType,
        Double audienceRuleValue,
        Long audienceRuleReferenceId
) {
    public AudiencePreviewRequest(
            Long batchId, Long collegeId, Long courseId,
            AudienceRuleType audienceRuleType, Double audienceRuleValue, Long audienceRuleReferenceId
    ) {
        this(batchId, batchId != null ? List.of(batchId) : List.of(),
                collegeId, courseId, courseId != null ? List.of(courseId) : List.of(),
                audienceRuleType, audienceRuleValue, audienceRuleReferenceId);
    }

    public List<Long> resolveBatchIds() {
        if (batchIds != null && !batchIds.isEmpty()) return batchIds;
        return batchId != null ? List.of(batchId) : List.of();
    }

    public List<Long> resolveCourseIds() {
        if (courseIds != null && !courseIds.isEmpty()) return courseIds;
        return courseId != null ? List.of(courseId) : List.of();
    }
}