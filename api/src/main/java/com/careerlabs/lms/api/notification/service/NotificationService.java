package com.careerlabs.lms.api.notification.service;

import com.careerlabs.lms.api.notification.dto.response.NotificationResponse;
import com.careerlabs.lms.api.notification.entity.NotificationType;

import java.util.List;

public interface NotificationService {

    /**
     * Fetch all notifications (up to 50, newest first) for the given user.
     */
    List<NotificationResponse> getForUser(Long userId);

    /**
     * Fetch all notifications (unbounded, newest first) for the given user.
     */
    List<NotificationResponse> list(Long userId);

    /**
     * Fetch notifications for the given user narrowed by optional filters.
     * {@code category} is one of ASSIGNMENTS, QUIZZES, PLACEMENT, ANNOUNCEMENTS
     * (ALL/blank = no category filter); {@code search} matches title/body
     * case-insensitively; {@code unreadOnly=true} returns unread only.
     */
    List<NotificationResponse> list(Long userId, String category, String search, Boolean unreadOnly);

    /**
     * Mark a single notification as read.
     * Throws ResourceNotFoundException if the notification doesn't belong to this user.
     */
    NotificationResponse markRead(Long notificationId, Long userId);

    /**
     * Mark all unread notifications as read for the given user.
     * Returns the count of updated rows.
     */
    int markAllRead(Long userId);

    /**
     * Count unread notifications for a user (for badge display).
     */
    long countUnread(Long userId);

    // ─── Creation helpers called by other services ─────────────────────────────

    /**
     * Send a notification to a single user.
     */
    void notifyUser(Long userId, String title, String body, NotificationType type, String link);

    /**
     * Fan-out a notification to every student in a batch.
     */
    void notifyBatch(Long batchId, String title, String body, NotificationType type, String link);

    /**
     * Fan-out a notification to ALL active students (global broadcast).
     */
    void notifyAllStudents(String title, String body, NotificationType type, String link);

    /**
     * Fan-out a notification to ALL active ADMIN / SUPERADMIN / TRAINER users.
     */
    void notifyAdmins(String title, String body, NotificationType type, String link);

    /**
     * Send a notification to a single user (alternate parameter order, kept for
     * callers built against the earlier minimal API - equivalent to notifyUser).
     */
    void create(Long userId, NotificationType type, String title, String body, String link);
}
