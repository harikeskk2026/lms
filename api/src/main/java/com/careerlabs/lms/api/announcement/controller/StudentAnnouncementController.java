package com.careerlabs.lms.api.announcement.controller;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementCommentRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementCommentResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.service.AnnouncementCommentService;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/announcements")
public class StudentAnnouncementController {

    private final AnnouncementService announcementService;
    private final AnnouncementCommentService commentService;

    public StudentAnnouncementController(AnnouncementService announcementService,
                                          AnnouncementCommentService commentService) {
        this.announcementService = announcementService;
        this.commentService = commentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> list(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(announcementService.listForStudent(principal.id())));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<ApiResponse<Void>> markViewed(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        announcementService.recordView(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(null));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> acknowledge(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Acknowledged", announcementService.acknowledge(id, principal.id())));
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
}
