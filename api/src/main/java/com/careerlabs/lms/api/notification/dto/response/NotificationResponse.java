package com.careerlabs.lms.api.notification.dto.response;

import com.careerlabs.lms.api.notification.entity.Notification;
import com.careerlabs.lms.api.notification.entity.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String title,
        String body,
        NotificationType type,
        boolean isRead,
        String link,
        Instant createdAt
) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getBody(),
                notification.getType(),
                notification.isRead(),
                notification.getLink(),
                notification.getCreatedAt());
    }
}
