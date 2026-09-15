package com.careerlabs.lms.api.meeting.service;

import com.careerlabs.lms.api.meeting.dto.request.CreateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.request.UpdateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.response.MeetingLinkResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.security.JwtUserPrincipal;

import java.util.List;

public interface MeetingLinkService {

    MeetingLinkResponse createMeetingLink(CreateMeetingLinkRequest request, JwtUserPrincipal principal);

    MeetingLinkResponse updateMeetingLink(Long id, UpdateMeetingLinkRequest request, JwtUserPrincipal principal);

    MeetingLinkResponse updateMeetingStatus(Long id, MeetingStatus status, JwtUserPrincipal principal);

    void deleteMeetingLink(Long id, JwtUserPrincipal principal);

    MeetingLinkResponse getMeetingById(Long id, JwtUserPrincipal principal);

    List<MeetingLinkResponse> getAdminMeetings(Long courseId, Long batchId, MeetingStatus status, String search, JwtUserPrincipal principal);

    List<MeetingLinkResponse> getAdminMeetings(Long batchId, MeetingStatus status, JwtUserPrincipal principal);

    List<MeetingLinkResponse> getStudentMeetings(Long currentUserId);

    List<MeetingLinkResponse> getStudentLiveMeetings(Long currentUserId);
}
