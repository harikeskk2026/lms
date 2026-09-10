package com.careerlabs.lms.api.announcement.dto.request;

public record PlaceholderPreviewRequest(
        String title,
        String body,
        Long courseId,
        Long batchId
) {
    public PlaceholderPreviewRequest(String title, String body) {
        this(title, body, null, null);
    }
}
