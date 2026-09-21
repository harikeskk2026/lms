package com.careerlabs.lms.api.recordedsession.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.recordedsession.dto.request.CreateRecordedSessionRequest;
import com.careerlabs.lms.api.recordedsession.dto.request.UpdateRecordedSessionRequest;
import com.careerlabs.lms.api.recordedsession.dto.response.AuditLogResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.BlockedStudentResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.PlaybackSessionAdminResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.ProcessingStatusResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionAnalyticsResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionPageResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionResponse;
import com.careerlabs.lms.api.recordedsession.service.PlaybackAuthorizationService;
import com.careerlabs.lms.api.recordedsession.service.RecordedSessionService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/recorded-sessions")
public class AdminRecordedSessionController {

    private final RecordedSessionService recordedSessionService;
    private final PlaybackAuthorizationService playbackAuthorizationService;

    public AdminRecordedSessionController(RecordedSessionService recordedSessionService,
                                           PlaybackAuthorizationService playbackAuthorizationService) {
        this.recordedSessionService = recordedSessionService;
        this.playbackAuthorizationService = playbackAuthorizationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<RecordedSessionPageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(recordedSessionService.list(search, status, page, limit)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RecordedSessionResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(recordedSessionService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RecordedSessionResponse>> create(@Valid @RequestBody CreateRecordedSessionRequest request,
                                                                         @AuthenticationPrincipal JwtUserPrincipal principal) {
        RecordedSessionResponse response = recordedSessionService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Recorded session created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RecordedSessionResponse>> update(@PathVariable Long id,
                                                                         @Valid @RequestBody UpdateRecordedSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Recorded session updated", recordedSessionService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        recordedSessionService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Recorded session deleted", null));
    }

    @PostMapping("/{id}/upload")
    public ResponseEntity<ApiResponse<Void>> upload(
            @PathVariable Long id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "video", required = false) MultipartFile video) {
        MultipartFile uploadFile = file != null ? file : video;
        if (uploadFile == null || uploadFile.isEmpty()) {
            throw new com.careerlabs.lms.api.common.exception.BadRequestException("A video file is required (form key 'file' or 'video')");
        }
        recordedSessionService.uploadVideo(id, uploadFile);
        return ResponseEntity.accepted().body(ApiResponse.of("Video uploaded — processing started", null));
    }

    @GetMapping("/{id}/processing-status")
    public ResponseEntity<ApiResponse<ProcessingStatusResponse>> processingStatus(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(recordedSessionService.getProcessingStatus(id)));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<RecordedSessionResponse>> publish(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Recorded session published", recordedSessionService.publish(id)));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<RecordedSessionResponse>> archive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Recorded session archived", recordedSessionService.archive(id)));
    }

    @GetMapping("/{id}/analytics")
    public ResponseEntity<ApiResponse<RecordedSessionAnalyticsResponse>> analytics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(recordedSessionService.getAnalytics(id)));
    }

    @GetMapping("/{id}/playback-sessions")
    public ResponseEntity<ApiResponse<List<PlaybackSessionAdminResponse>>> playbackSessions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(playbackAuthorizationService.listPlaybackSessions(id)));
    }

    @GetMapping("/{id}/audit-log")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> auditLog(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(playbackAuthorizationService.listAuditLog(id)));
    }

    @PostMapping("/playback-sessions/{playbackSessionId}/revoke")
    public ResponseEntity<ApiResponse<Void>> revokeSession(@PathVariable Long playbackSessionId) {
        playbackAuthorizationService.revokeSession(playbackSessionId);
        return ResponseEntity.ok(ApiResponse.of("Playback session revoked", null));
    }

    @PostMapping("/students/{studentUserId}/revoke-all-sessions")
    public ResponseEntity<ApiResponse<Void>> revokeAllForStudent(@PathVariable Long studentUserId) {
        playbackAuthorizationService.revokeAllForStudent(studentUserId);
        return ResponseEntity.ok(ApiResponse.of("All active playback sessions revoked for this student", null));
    }

    @GetMapping("/{id}/blocked-students")
    public ResponseEntity<ApiResponse<List<BlockedStudentResponse>>> blockedStudents(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(playbackAuthorizationService.listBlockedStudents(id)));
    }

    @PostMapping("/{id}/block-student/{studentUserId}")
    public ResponseEntity<ApiResponse<Void>> blockStudent(@PathVariable Long id, @PathVariable Long studentUserId,
                                                            @AuthenticationPrincipal JwtUserPrincipal principal) {
        playbackAuthorizationService.blockStudent(id, studentUserId, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Student blocked from this recording", null));
    }

    @PostMapping("/{id}/unblock-student/{studentUserId}")
    public ResponseEntity<ApiResponse<Void>> unblockStudent(@PathVariable Long id, @PathVariable Long studentUserId) {
        playbackAuthorizationService.unblockStudent(id, studentUserId);
        return ResponseEntity.ok(ApiResponse.of("Student unblocked", null));
    }
}
