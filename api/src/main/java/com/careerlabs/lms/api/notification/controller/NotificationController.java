package com.careerlabs.lms.api.notification.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.notification.dto.NotificationResponse;
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
 * Student-facing notification endpoints.
 * All routes are secured by the JWT filter; the student's userId is extracted
 * from the principal so no other student can read or modify another's notifications.
 */
@RestController
@RequestMapping("/api/student/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * GET /api/student/notifications
     * Returns the latest 50 notifications for the authenticated student.
     * Also includes the total unread count for badge display.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> list(
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        List<NotificationResponse> notifications = notificationService.getForUser(principal.id());
        long unreadCount = notificationService.countUnread(principal.id());

        Map<String, Object> payload = Map.of(
                "notifications", notifications,
                "unreadCount", unreadCount
        );
        return ResponseEntity.ok(ApiResponse.of(payload));
    }

    /**
     * PATCH /api/student/notifications/{id}/read
     * Marks a single notification as read. Returns the updated notification.
     * Returns 404 if the notification doesn't exist or doesn't belong to this user.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        NotificationResponse updated = notificationService.markRead(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Notification marked as read", updated));
    }

    /**
     * PATCH /api/student/notifications/read-all
     * Marks ALL unread notifications as read for the authenticated student.
     * Returns the count of notifications that were updated.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllRead(
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        int updated = notificationService.markAllRead(principal.id());
        return ResponseEntity.ok(ApiResponse.of("All notifications marked as read",
                Map.of("updated", updated)));
    }

    /**
     * GET /api/student/notifications/unread-count
     * Lightweight endpoint — returns only the unread badge count.
     * Suitable for polling every 30 seconds from the shell.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal JwtUserPrincipal principal) {

        long count = notificationService.countUnread(principal.id());
        return ResponseEntity.ok(ApiResponse.of(Map.of("unreadCount", count)));
    }
}
