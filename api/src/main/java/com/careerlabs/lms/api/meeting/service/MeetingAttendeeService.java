package com.careerlabs.lms.api.meeting.service;

import com.careerlabs.lms.api.meeting.dto.response.MeetingAttendeeResponse;

import java.util.List;

public interface MeetingAttendeeService {

    /** Records (or updates) that this student clicked Join for this meeting. */
    void recordJoin(Long meetingId, Long studentUserId);

    List<MeetingAttendeeResponse> listAttendees(Long meetingId);
}
