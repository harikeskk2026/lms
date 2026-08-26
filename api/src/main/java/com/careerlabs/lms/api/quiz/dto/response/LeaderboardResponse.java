package com.careerlabs.lms.api.quiz.dto.response;

import java.util.List;

public record LeaderboardResponse(
        String type,
        List<Entry> entries,
        Entry currentUserEntry
) {

    public record Entry(
            int rank,
            Long studentId,
            String studentName,
            double value
    ) {
    }
}
