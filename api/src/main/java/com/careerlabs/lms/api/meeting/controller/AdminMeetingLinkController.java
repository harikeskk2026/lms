package com.careerlabs.lms.api.meeting.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.meeting.dto.request.CreateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.request.UpdateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.response.MeetingAttendeeResponse;
import com.careerlabs.lms.api.meeting.dto.response.MeetingLinkResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.meeting.service.MeetingAttendeeService;
import com.careerlabs.lms.api.meeting.service.MeetingLinkService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/meetings")
public class AdminMeetingLinkController {

    private final MeetingLinkService meetingLinkService;
    private final MeetingAttendeeService meetingAttendeeService;

    public AdminMeetingLinkController(MeetingLinkService meetingLinkService,
                                       MeetingAttendeeService meetingAttendeeService) {
        this.meetingLinkService = meetingLinkService;
        this.meetingAttendeeService = meetingAttendeeService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MeetingLinkResponse>> create(
            @Valid @RequestBody CreateMeetingLinkRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        MeetingLinkResponse res = meetingLinkService.createMeetingLink(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(res));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MeetingLinkResponse>>> list(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) MeetingStatus status,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        List<MeetingLinkResponse> list = meetingLinkService.getAdminMeetings(courseId, batchId, status, search, principal);
        return ResponseEntity.ok(ApiResponse.of(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MeetingLinkResponse>> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        MeetingLinkResponse res = meetingLinkService.getMeetingById(id, principal);
        return ResponseEntity.ok(ApiResponse.of(res));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MeetingLinkResponse>> update(
            @PathVariable Long id,
            @RequestBody UpdateMeetingLinkRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        MeetingLinkResponse res = meetingLinkService.updateMeetingLink(id, request, principal);
        return ResponseEntity.ok(ApiResponse.of(res));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<MeetingLinkResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam MeetingStatus status,
            @AuthenticationPrincipal JwtUserPrincipal principal
    ) {
        MeetingLinkResponse res = meetingLinkService.updateMeetingStatus(id, status, principal);
        return ResponseEntity.ok(ApiResponse.of(res));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        meetingLinkService.deleteMeetingLink(id, principal);
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    @GetMapping("/{id}/attendees")
    public ResponseEntity<ApiResponse<List<MeetingAttendeeResponse>>> attendees(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(meetingAttendeeService.listAttendees(id, principal)));
    }
}
