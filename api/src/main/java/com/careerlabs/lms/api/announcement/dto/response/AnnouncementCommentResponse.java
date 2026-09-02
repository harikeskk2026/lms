package com.careerlabs.lms.api.announcement.dto.response;

import com.careerlabs.lms.api.announcement.entity.AnnouncementComment;

import java.time.Instant;

public record AnnouncementCommentResponse(
        Long id,
        Long userId,
        String userName,
        String userRole,
        Long parentCommentId,
        String content,
        Instant createdAt
) {

    public static AnnouncementCommentResponse from(AnnouncementComment c) {
        return new AnnouncementCommentResponse(
                c.getId(),
                c.getUser().getId(),
                c.getUser().getName(),
                c.getUser().getRole() != null ? c.getUser().getRole().name() : null,
                c.getParentComment() != null ? c.getParentComment().getId() : null,
                c.getContent(),
                c.getCreatedAt());
    }
}
