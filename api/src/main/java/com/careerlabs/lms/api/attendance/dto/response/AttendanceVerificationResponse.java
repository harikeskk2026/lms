package com.careerlabs.lms.api.attendance.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Cross-checks a student's attendance-correction request against Scheduled Class
 * (Zoom) join records for the same batch and day, so an admin can see real evidence
 * before approving/rejecting — approval itself still happens through the existing
 * correction-review endpoint, this is read-only.
 */
public record AttendanceVerificationResponse(
        Long dailyClassId,
        String dailyClassTitle,
        LocalDateTime dailyClassDate,
        boolean verified,
        List<MatchedMeeting> matchedMeetings
) {
    public record MatchedMeeting(
            Long meetingId,
            String title,
            String platform,
            LocalDateTime scheduledStart,
            boolean joined,
            Instant firstJoinedAt,
            Instant lastJoinedAt,
            int joinCount
    ) {
    }
}
