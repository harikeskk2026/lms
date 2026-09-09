package com.careerlabs.lms.api.announcement.dto.request;

import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;

/**
 * Targeting selection used to estimate how many students a new/updated
 * announcement would reach, without persisting anything.
 */
public record AudiencePreviewRequest(
        Long batchId,
        Long collegeId,
        Long courseId,
        AudienceRuleType audienceRuleType,
        Double audienceRuleValue,
        Long audienceRuleReferenceId
) {}