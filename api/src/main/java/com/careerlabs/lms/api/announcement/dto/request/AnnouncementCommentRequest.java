package com.careerlabs.lms.api.announcement.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AnnouncementCommentRequest(
        @NotBlank(message = "content is required")
        String content,

        Long parentCommentId
) {
}
