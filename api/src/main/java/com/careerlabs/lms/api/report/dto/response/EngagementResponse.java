package com.careerlabs.lms.api.report.dto.response;

public record EngagementResponse(
        long highCount,
        long mediumCount,
        long lowCount,
        double highPct,
        double mediumPct,
        double lowPct
) {
}
