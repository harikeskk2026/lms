package com.careerlabs.lms.api.announcement.dto.response;

public record AnnouncementAnalyticsResponse(
        long targeted,
        long viewed,
        long unread,
        long acknowledged,
        long pendingAcknowledgment,
        double viewRatePercent,
        double acknowledgmentRatePercent
) {

    public static AnnouncementAnalyticsResponse of(long targeted, long viewed, long acknowledged, boolean requiresAck) {
        long unread = Math.max(0, targeted - viewed);
        long pending = requiresAck ? Math.max(0, targeted - acknowledged) : 0;
        double viewRate = targeted == 0 ? 0.0 : Math.round(viewed * 1000.0 / targeted) / 10.0;
        double ackRate = targeted == 0 ? 0.0 : Math.round(acknowledged * 1000.0 / targeted) / 10.0;
        return new AnnouncementAnalyticsResponse(targeted, viewed, unread, acknowledged, pending, viewRate, ackRate);
    }
}
