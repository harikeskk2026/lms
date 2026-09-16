package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.DriveType;
import com.careerlabs.lms.api.placement.validation.DriveValidationMessages;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public class CreateDriveRequest {

    @NotBlank(message = DriveValidationMessages.COMPANY_NAME_REQUIRED)
    private String companyName;

    @NotBlank(message = DriveValidationMessages.ROLE_REQUIRED)
    private String role;

    private String packageOffered;

    private String location;

    @NotNull(message = DriveValidationMessages.DRIVE_DATE_REQUIRED)
    private LocalDate driveDate;

    @NotNull(message = DriveValidationMessages.APPLY_DEADLINE_REQUIRED)
    private LocalDate applyDeadline;

    @NotBlank(message = DriveValidationMessages.DESCRIPTION_REQUIRED)
    private String description;

    private List<String> requirements = List.of();

    private List<String> skills = List.of();

    @NotNull(message = DriveValidationMessages.DRIVE_TYPE_REQUIRED)
    private DriveType driveType = DriveType.CAMPUS;

    private String applyLink;

    @DecimalMin(value = "0", message = DriveValidationMessages.MIN_CGPA_INVALID)
    @DecimalMax(value = "10", message = DriveValidationMessages.MIN_CGPA_INVALID)
    private Double minCgpa;

    @DecimalMin(value = "0", message = DriveValidationMessages.MIN_PERCENTAGE_INVALID)
    @DecimalMax(value = "100", message = DriveValidationMessages.MIN_PERCENTAGE_INVALID)
    private Double minPercentage;

    @Min(value = 0, message = DriveValidationMessages.MAX_BACKLOGS_INVALID)
    private Integer maxBacklogs;

    @DecimalMin(value = "0", message = DriveValidationMessages.MIN_ATTENDANCE_INVALID)
    @DecimalMax(value = "100", message = DriveValidationMessages.MIN_ATTENDANCE_INVALID)
    private Double minAttendancePct;

    private List<Long> eligibleBatchIds = List.of();

    private List<Long> eligibleCourseIds = List.of();

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getPackageOffered() {
        return packageOffered;
    }

    public void setPackageOffered(String packageOffered) {
        this.packageOffered = packageOffered;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDate getDriveDate() {
        return driveDate;
    }

    public void setDriveDate(LocalDate driveDate) {
        this.driveDate = driveDate;
    }

    public LocalDate getApplyDeadline() {
        return applyDeadline;
    }

    public void setApplyDeadline(LocalDate applyDeadline) {
        this.applyDeadline = applyDeadline;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getRequirements() {
        return requirements;
    }

    public void setRequirements(List<String> requirements) {
        this.requirements = requirements;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public DriveType getDriveType() {
        return driveType;
    }

    public void setDriveType(DriveType driveType) {
        this.driveType = driveType;
    }

    public String getApplyLink() {
        return applyLink;
    }

    public void setApplyLink(String applyLink) {
        this.applyLink = applyLink;
    }

    public Double getMinCgpa() {
        return minCgpa;
    }

    public void setMinCgpa(Double minCgpa) {
        this.minCgpa = minCgpa;
    }

    public Double getMinPercentage() {
        return minPercentage;
    }

    public void setMinPercentage(Double minPercentage) {
        this.minPercentage = minPercentage;
    }

    public Integer getMaxBacklogs() {
        return maxBacklogs;
    }

    public void setMaxBacklogs(Integer maxBacklogs) {
        this.maxBacklogs = maxBacklogs;
    }

    public Double getMinAttendancePct() {
        return minAttendancePct;
    }

    public void setMinAttendancePct(Double minAttendancePct) {
        this.minAttendancePct = minAttendancePct;
    }

    public List<Long> getEligibleBatchIds() {
        return eligibleBatchIds;
    }

    public void setEligibleBatchIds(List<Long> eligibleBatchIds) {
        this.eligibleBatchIds = eligibleBatchIds;
    }

    public List<Long> getEligibleCourseIds() {
        return eligibleCourseIds;
    }

    public void setEligibleCourseIds(List<Long> eligibleCourseIds) {
        this.eligibleCourseIds = eligibleCourseIds;
    }
}
