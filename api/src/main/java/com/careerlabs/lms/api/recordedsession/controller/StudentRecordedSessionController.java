package com.careerlabs.lms.api.recordedsession.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.recordedsession.dto.request.HeartbeatRequest;
import com.careerlabs.lms.api.recordedsession.dto.request.PlaybackStartRequest;
import com.careerlabs.lms.api.recordedsession.dto.response.PlaybackStartResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.StudentRecordedSessionResponse;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackEventType;
import com.careerlabs.lms.api.recordedsession.service.PlaybackAuthorizationService;
import com.careerlabs.lms.api.recordedsession.service.RecordedSessionService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/recorded-sessions")
public class StudentRecordedSessionController {

    private final RecordedSessionService recordedSessionService;
    private final PlaybackAuthorizationService playbackAuthorizationService;

    public StudentRecordedSessionController(RecordedSessionService recordedSessionService,
                                             PlaybackAuthorizationService playbackAuthorizationService) {
        this.recordedSessionService = recordedSessionService;
        this.playbackAuthorizationService = playbackAuthorizationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentRecordedSessionResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(recordedSessionService.listForStudent(principal.id())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentRecordedSessionResponse>> get(@PathVariable Long id,
                                                                             @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(recordedSessionService.getForStudent(id, principal.id())));
    }

    @PostMapping("/{id}/playback")
    public ResponseEntity<ApiResponse<PlaybackStartResponse>> startPlayback(@PathVariable Long id,
                                                                              @Valid @RequestBody PlaybackStartRequest request,
                                                                              @AuthenticationPrincipal JwtUserPrincipal principal,
                                                                              HttpServletRequest servletRequest) {
        PlaybackStartResponse response = playbackAuthorizationService.startPlayback(
                principal.id(), id, request, clientIp(servletRequest), servletRequest.getHeader("User-Agent"));
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/playback/{playbackSessionId}/heartbeat")
    public ResponseEntity<ApiResponse<Void>> heartbeat(@PathVariable Long playbackSessionId,
                                                         @Valid @RequestBody HeartbeatRequest request,
                                                         @AuthenticationPrincipal JwtUserPrincipal principal) {
        playbackAuthorizationService.heartbeat(playbackSessionId, principal.id(), request.getPositionSeconds());
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    @PostMapping("/playback/{playbackSessionId}/end")
    public ResponseEntity<ApiResponse<Void>> end(@PathVariable Long playbackSessionId,
                                                   @AuthenticationPrincipal JwtUserPrincipal principal) {
        playbackAuthorizationService.end(playbackSessionId, principal.id());
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    /**
     * Best-effort client report of a detected capture attempt (currently: the
     * Windows PrintScreen key only). Logged for the audit trail — the capture
     * already happened at the OS level by the time this call is made.
     */
    @PostMapping("/playback/{playbackSessionId}/capture-detected")
    public ResponseEntity<ApiResponse<Void>> captureDetected(@PathVariable Long playbackSessionId,
                                                               @RequestParam(required = false) Integer positionSeconds,
                                                               @AuthenticationPrincipal JwtUserPrincipal principal) {
        playbackAuthorizationService.recordCaptureAttempt(playbackSessionId, principal.id(), positionSeconds);
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    /**
     * Low-severity client-reported UI signal (tab hidden, window blurred,
     * fullscreen exited) — restricted server-side to a safe allow-list of
     * event types. None of these prove an actual capture happened.
     */
    @PostMapping("/playback/{playbackSessionId}/client-event")
    public ResponseEntity<ApiResponse<Void>> clientEvent(@PathVariable Long playbackSessionId,
                                                            @RequestParam PlaybackEventType eventType,
                                                            @RequestParam(required = false) Integer positionSeconds,
                                                            @AuthenticationPrincipal JwtUserPrincipal principal) {
        playbackAuthorizationService.recordClientEvent(playbackSessionId, principal.id(), eventType, positionSeconds);
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
