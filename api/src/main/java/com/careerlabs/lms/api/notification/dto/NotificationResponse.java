package com.careerlabs.lms.api.notification.dto;

import com.careerlabs.lms.api.notification.entity.Notification;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String title,
        String body,
        String type,
        boolean isRead,
        String link,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getBody(),
                n.getType().name(),
                n.isRead(),
                n.getLink(),
                n.getCreatedAt()
        );
    }
}
