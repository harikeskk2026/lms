package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;

import java.time.Instant;

public record DriveApplicationResponse(
        Long id,
        Long driveId,
        String companyName,
        String role,
        Long studentId,
        String studentName,
        DriveApplicationStatus status,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {

    public static DriveApplicationResponse from(DriveApplication application) {
        return new DriveApplicationResponse(
                application.getId(),
                application.getDrive().getId(),
                application.getDrive().getCompanyName(),
                application.getDrive().getRole(),
                application.getStudent().getId(),
                application.getStudent().getUser().getName(),
                application.getStatus(),
                application.getNotes(),
                application.getCreatedAt(),
                application.getUpdatedAt());
    }
}
