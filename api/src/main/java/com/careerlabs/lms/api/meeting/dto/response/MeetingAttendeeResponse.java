package com.careerlabs.lms.api.meeting.dto.response;

import com.careerlabs.lms.api.meeting.entity.MeetingAttendee;

import java.time.Instant;

public record MeetingAttendeeResponse(
        Long studentUserId,
        String name,
        String email,
        Instant firstJoinedAt,
        Instant lastJoinedAt,
        int joinCount
) {
    public static MeetingAttendeeResponse from(MeetingAttendee a, String name, String email) {
        return new MeetingAttendeeResponse(
                a.getStudentUserId(), name, email, a.getFirstJoinedAt(), a.getLastJoinedAt(), a.getJoinCount());
    }
}
