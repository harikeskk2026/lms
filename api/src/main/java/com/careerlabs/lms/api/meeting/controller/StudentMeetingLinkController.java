package com.careerlabs.lms.api.meeting.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.meeting.dto.response.MeetingLinkResponse;
import com.careerlabs.lms.api.meeting.service.MeetingAttendeeService;
import com.careerlabs.lms.api.meeting.service.MeetingLinkService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/meetings")
public class StudentMeetingLinkController {

    private final MeetingLinkService meetingLinkService;
    private final MeetingAttendeeService meetingAttendeeService;

    public StudentMeetingLinkController(MeetingLinkService meetingLinkService,
                                         MeetingAttendeeService meetingAttendeeService) {
        this.meetingLinkService = meetingLinkService;
        this.meetingAttendeeService = meetingAttendeeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MeetingLinkResponse>>> getMyMeetings(
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        Long currentUserId = principal != null ? principal.id() : null;
        List<MeetingLinkResponse> list = meetingLinkService.getStudentMeetings(currentUserId);
        return ResponseEntity.ok(ApiResponse.of(list));
    }

    @GetMapping("/live")
    public ResponseEntity<ApiResponse<List<MeetingLinkResponse>>> getMyLiveMeetings(
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        Long currentUserId = principal != null ? principal.id() : null;
        List<MeetingLinkResponse> list = meetingLinkService.getStudentLiveMeetings(currentUserId);
        return ResponseEntity.ok(ApiResponse.of(list));
    }

    /** Fired when a student clicks "Join Meeting" — lets admins see who joined a class. */
    @PostMapping("/{id}/join")
    public ResponseEntity<ApiResponse<Void>> recordJoin(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        meetingAttendeeService.recordJoin(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(null));
    }
}
