package com.careerlabs.lms.api.announcement.controller;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementCommentRequest;
import com.careerlabs.lms.api.announcement.dto.request.AnnouncementRequest;
import com.careerlabs.lms.api.announcement.dto.request.AudiencePreviewRequest;
import com.careerlabs.lms.api.announcement.dto.request.PlaceholderPreviewRequest;
import com.careerlabs.lms.api.announcement.dto.request.ScheduleRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementAnalyticsResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementCommentResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementSuggestionResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementVersionResponse;
import com.careerlabs.lms.api.announcement.dto.response.AudiencePreviewResponse;
import com.careerlabs.lms.api.announcement.dto.response.PlaceholderPreviewResponse;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.service.AnnouncementCommentService;
import com.careerlabs.lms.api.announcement.service.AnnouncementPlaceholderResolver;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/announcements")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
public class AdminAnnouncementController {

    private final AnnouncementService announcementService;
    private final AnnouncementCommentService commentService;
    private final AnnouncementPlaceholderResolver placeholderResolver;

    public AdminAnnouncementController(AnnouncementService announcementService,
                                        AnnouncementCommentService commentService,
                                        AnnouncementPlaceholderResolver placeholderResolver) {
        this.announcementService = announcementService;
        this.commentService = commentService;
        this.placeholderResolver = placeholderResolver;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> list(
            @RequestParam(required = false) AnnouncementStatus status) {
        return ResponseEntity.ok(ApiResponse.of(announcementService.list(status)));
    }

    @PostMapping("/preview-placeholders")
    public ResponseEntity<ApiResponse<PlaceholderPreviewResponse>> previewPlaceholders(
            @RequestBody PlaceholderPreviewRequest request) {
        var sample = placeholderResolver.sampleVariables();
        String title = placeholderResolver.resolve(request.title(), sample);
        String body = placeholderResolver.resolve(request.body(), sample);
        return ResponseEntity.ok(ApiResponse.of(new PlaceholderPreviewResponse(title, body)));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<AnnouncementSuggestionResponse>>> suggestions() {
        return ResponseEntity.ok(ApiResponse.of(announcementService.suggestions()));
    }

    @PostMapping("/audience-count")
    public ResponseEntity<ApiResponse<AudiencePreviewResponse>> audienceCount(
            @RequestBody AudiencePreviewRequest request) {
        long count = announcementService.estimateAudience(request);
        return ResponseEntity.ok(ApiResponse.of(new AudiencePreviewResponse(count)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AnnouncementResponse>> create(
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AnnouncementResponse created = announcementService.create(request, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Announcement saved", created));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AnnouncementResponse updated = announcementService.update(id, request, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Announcement updated", updated));
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> publish(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Announcement published", announcementService.publish(id)));
    }

    @PatchMapping("/{id}/schedule")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> schedule(
            @PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Announcement scheduled", announcementService.schedule(id, request)));
    }

    @PostMapping("/{id}/submit-for-approval")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> submitForApproval(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Submitted for approval", announcementService.submitForApproval(id)));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> approve(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Announcement approved", announcementService.approve(id, principal.id())));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> reject(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Announcement rejected", announcementService.reject(id)));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> duplicate(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Announcement duplicated", announcementService.duplicate(id, principal.id())));
    }

    @GetMapping("/{id}/analytics")
    public ResponseEntity<ApiResponse<AnnouncementAnalyticsResponse>> analytics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(announcementService.analytics(id)));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<AnnouncementVersionResponse>>> history(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(announcementService.history(id)));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<List<AnnouncementCommentResponse>>> comments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(commentService.list(id)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<AnnouncementCommentResponse>> addComment(
            @PathVariable Long id, @Valid @RequestBody AnnouncementCommentRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(commentService.add(id, request, principal.id())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        announcementService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Announcement deleted", null));
    }
}
