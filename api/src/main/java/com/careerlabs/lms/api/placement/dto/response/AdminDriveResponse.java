package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AdminDriveResponse(
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
        String applyLink,
        Double minCgpa,
        Double minPercentage,
        Integer maxBacklogs,
        Double minAttendancePct,
        List<DriveEligibilityRef> eligibleBatches,
        List<DriveEligibilityRef> eligibleCourses,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt,
        Count _count
) {

    public record Count(long applications) {
    }

    public static AdminDriveResponse from(Drive drive, long applicationCount) {
        return new AdminDriveResponse(
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
                drive.getApplyLink(),
                drive.getMinCgpa(),
                drive.getMinPercentage(),
                drive.getMaxBacklogs(),
                drive.getMinAttendancePct(),
                drive.getEligibleBatches().stream().map(b -> new DriveEligibilityRef(b.getId(), b.getName())).toList(),
                drive.getEligibleCourses().stream().map(c -> new DriveEligibilityRef(c.getId(), c.getTitle())).toList(),
                drive.getCreatedBy(),
                drive.getCreatedAt(),
                drive.getUpdatedAt(),
                new Count(applicationCount));
    }
}
