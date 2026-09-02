package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatusHistory;

import java.time.Instant;

public record DriveApplicationStatusHistoryResponse(
        Long id,
        DriveApplicationStatus fromStatus,
        DriveApplicationStatus toStatus,
        String changedByName,
        String note,
        Instant changedAt
) {

    public static DriveApplicationStatusHistoryResponse from(DriveApplicationStatusHistory history) {
        return new DriveApplicationStatusHistoryResponse(
                history.getId(),
                history.getFromStatus(),
                history.getToStatus(),
                history.getChangedBy().getName(),
                history.getNote(),
                history.getChangedAt());
    }
}
