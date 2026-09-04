package com.careerlabs.lms.api.meeting.service;

import com.careerlabs.lms.api.meeting.dto.request.CreateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.request.UpdateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.response.MeetingLinkResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;

import java.util.List;

public interface MeetingLinkService {

    MeetingLinkResponse createMeetingLink(CreateMeetingLinkRequest request, Long currentUserId);

    MeetingLinkResponse updateMeetingLink(Long id, UpdateMeetingLinkRequest request);

    MeetingLinkResponse updateMeetingStatus(Long id, MeetingStatus status);

    void deleteMeetingLink(Long id);

    MeetingLinkResponse getMeetingById(Long id);

    List<MeetingLinkResponse> getAdminMeetings(Long batchId, MeetingStatus status);

    List<MeetingLinkResponse> getStudentMeetings(Long currentUserId);

    List<MeetingLinkResponse> getStudentLiveMeetings(Long currentUserId);
}
