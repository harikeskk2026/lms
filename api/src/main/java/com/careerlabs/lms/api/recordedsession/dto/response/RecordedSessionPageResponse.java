package com.careerlabs.lms.api.recordedsession.dto.response;

import java.util.List;

/** Server-paginated admin list of recorded sessions. */
public record RecordedSessionPageResponse(
        List<RecordedSessionResponse> sessions,
        long totalElements,
        int totalPages,
        int page
) {
}