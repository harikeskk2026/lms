package com.careerlabs.lms.api.recordedsession.dto.response;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionStatus;

public record ProcessingStatusResponse(
        RecordedSessionStatus status,
        String processingError,
        Integer durationSeconds
) {
}
