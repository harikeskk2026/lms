package com.careerlabs.lms.api.quiz.dto.response;

import java.time.Instant;

public record AchievementResponse(
        String code,
        String name,
        String description,
        int xpReward,
        boolean unlocked,
        Instant unlockedAt
) {
}
