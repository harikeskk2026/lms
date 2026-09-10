package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.Placement;

import java.time.Instant;
import java.time.LocalDate;

/** Final placement record for a student. */
public record PlacementResponse(
        Long id,
        Long studentId,
        String studentName,
        Long driveId,
        String companyName,
        String role,
        String ctc,
        LocalDate placementDate,
        LocalDate joiningDate,
        String placementType,
        Long offerId,
        Instant createdAt
) {

    public static PlacementResponse from(Placement placement) {
        return new PlacementResponse(
                placement.getId(),
                placement.getStudent().getId(),
                placement.getStudent().getUser().getName(),
                placement.getDrive() != null ? placement.getDrive().getId() : null,
                placement.getCompanyName(),
                placement.getRole(),
                placement.getCtc(),
                placement.getPlacementDate(),
                placement.getJoiningDate(),
                placement.getPlacementType().name(),
                placement.getOffer() != null ? placement.getOffer().getId() : null,
                placement.getCreatedAt());
    }
}