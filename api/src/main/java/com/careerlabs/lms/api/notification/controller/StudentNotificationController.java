package com.careerlabs.lms.api.notification.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.notification.dto.response.NotificationResponse;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/notifications")
public class StudentNotificationController {

    private final NotificationService notificationService;

    public StudentNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(notificationService.list(principal.id())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(@PathVariable Long id,
                                                                         @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(notificationService.markRead(id, principal.id())));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@AuthenticationPrincipal JwtUserPrincipal principal) {
        notificationService.markAllRead(principal.id());
        return ResponseEntity.ok(ApiResponse.of("All notifications marked read", null));
    }

    /** Lightweight endpoint for polling the unread badge count (e.g. every 30s from the shell). */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> unreadCount(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(notificationService.countUnread(principal.id())));
    }
}
