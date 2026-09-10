package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.AptitudeTip;

import java.time.Instant;

public record AptitudeTipResponse(
        Long id,
        String topic,
        String formula,
        String example,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static AptitudeTipResponse from(AptitudeTip tip) {
        return new AptitudeTipResponse(
                tip.getId(), tip.getTopic(), tip.getFormula(), tip.getExample(),
                tip.isActive(), tip.getCreatedAt(), tip.getUpdatedAt());
    }
}