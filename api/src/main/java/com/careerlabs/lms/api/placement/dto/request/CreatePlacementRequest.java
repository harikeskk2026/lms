package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.DriveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Manually record a placement (useful for off-campus / direct placements that
 * never flowed through a drive, or to backfill data). Accepting an offer
 * created by {@link CreateOfferRequest} automatically produces a Placement
 * with the same data - this endpoint is for paths that bypass the drive flow.
 */
public record CreatePlacementRequest(
        @NotNull Long studentId,
        Long driveId,
        @NotBlank String companyName,
        @NotBlank String role,
        String ctc,
        LocalDate joiningDate,
        LocalDate placementDate,
        DriveType placementType
) {}