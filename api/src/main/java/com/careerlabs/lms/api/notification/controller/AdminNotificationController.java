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
import java.util.Map;

/**
 * Admin-facing notification endpoints.
 * Admins see notifications sent to their own userId
 * (e.g. when students submit assignments).
 */
@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final NotificationService notificationService;

    public AdminNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /** GET /api/admin/notifications — returns latest 50 + unread count */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> list(
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        List<NotificationResponse> notifications = notificationService.getForUser(principal.id());
        long unreadCount = notificationService.countUnread(principal.id());

        return ResponseEntity.ok(ApiResponse.of(Map.of(
                "notifications", notifications,
                "unreadCount",   unreadCount
        )));
    }

    /** PATCH /api/admin/notifications/{id}/read — mark one as read */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        NotificationResponse updated = notificationService.markRead(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Notification marked as read", updated));
    }

    /** PATCH /api/admin/notifications/read-all */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllRead(
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        int updated = notificationService.markAllRead(principal.id());
        return ResponseEntity.ok(ApiResponse.of("All notifications marked as read",
                Map.of("updated", updated)));
    }

    /** GET /api/admin/notifications/unread-count — lightweight badge poll */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        return ResponseEntity.ok(ApiResponse.of(Map.of("unreadCount",
                notificationService.countUnread(principal.id()))));
    }
}
