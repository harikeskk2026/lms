package com.careerlabs.lms.api.recordedsession.dto.response;

public record RecordedSessionAnalyticsResponse(
        long totalAssigned,
        long uniqueStudentsStarted,
        long completed,
        double averageWatchSeconds,
        double completionRate,
        long currentlyWatching
) {
}
