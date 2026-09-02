package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.placement.entity.DriveStatus;
import com.careerlabs.lms.api.placement.entity.DriveType;

import java.time.LocalDate;
import java.util.List;

public record StudentDriveResponse(
        Long id,
        String companyName,
        String role,
        String packageOffered,
        String location,
        LocalDate driveDate,
        LocalDate applyDeadline,
        String description,
        List<String> requirements,
        List<String> skills,
        DriveType driveType,
        DriveStatus status,
        String applyLink,
        boolean isEligible,
        List<String> ineligibilityReasons,
        /** True when eligibility couldn't be fully checked because required academic
         *  details are missing from My Profile - distinct from a flat "not eligible". */
        boolean profileIncomplete,
        DriveApplicationStatus applicationStatus
) {

    public static StudentDriveResponse from(Drive drive, boolean isEligible, List<String> ineligibilityReasons,
                                              boolean profileIncomplete, DriveApplicationStatus applicationStatus) {
        return new StudentDriveResponse(
                drive.getId(),
                drive.getCompanyName(),
                drive.getRole(),
                drive.getPackageOffered(),
                drive.getLocation(),
                drive.getDriveDate(),
                drive.getApplyDeadline(),
                drive.getDescription(),
                drive.getRequirements(),
                drive.getSkills(),
                drive.getDriveType(),
                drive.getStatus(),
                drive.getApplyLink(),
                isEligible,
                ineligibilityReasons,
                profileIncomplete,
                applicationStatus);
    }
}
