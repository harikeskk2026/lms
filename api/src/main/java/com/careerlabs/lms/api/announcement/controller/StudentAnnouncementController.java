package com.careerlabs.lms.api.announcement.controller;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementCommentRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementCommentResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.dto.response.StudentAnnouncementPageResponse;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.service.AnnouncementCommentService;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/announcements")
@PreAuthorize("hasRole('STUDENT')")
public class StudentAnnouncementController {

    private final AnnouncementService announcementService;
    private final AnnouncementCommentService commentService;

    public StudentAnnouncementController(AnnouncementService announcementService,
                                          AnnouncementCommentService commentService) {
        this.announcementService = announcementService;
        this.commentService = commentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<StudentAnnouncementPageResponse>> list(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "category", required = false) AnnouncementCategory category,
            @RequestParam(value = "unread", required = false) Boolean unread,
            @RequestParam(value = "sort", required = false, defaultValue = "newest") String sort,
            @RequestParam(value = "page", required = false, defaultValue = "1") int page,
            @RequestParam(value = "limit", required = false, defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(
                announcementService.listForStudentPaged(principal.id(), search, category, unread, sort, page, limit)));
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
    public ResponseEntity<ApiResponse<List<AnnouncementCommentResponse>>> comments(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        announcementService.requireRecipientAccess(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(commentService.list(id)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<AnnouncementCommentResponse>> addComment(
            @PathVariable Long id, @Valid @RequestBody AnnouncementCommentRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        announcementService.requireRecipientAccess(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(commentService.add(id, request, principal.id())));
    }
}
