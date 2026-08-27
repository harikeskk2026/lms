package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.DriveStatus;
import com.careerlabs.lms.api.placement.entity.DriveType;
import com.careerlabs.lms.api.placement.validation.DriveValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public class UpdateDriveRequest {

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
    private DriveType driveType;

    @NotNull(message = DriveValidationMessages.STATUS_REQUIRED)
    private DriveStatus status;

    private String applyLink;

    private Double minCgpa;

    private Double minPercentage;

    private Integer maxBacklogs;

    private Double minAttendancePct;

    private List<Long> eligibleBatchIds = List.of();

    private List<Long> eligibleDepartmentIds = List.of();

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

    public DriveStatus getStatus() {
        return status;
    }

    public void setStatus(DriveStatus status) {
        this.status = status;
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

    public List<Long> getEligibleDepartmentIds() {
        return eligibleDepartmentIds;
    }

    public void setEligibleDepartmentIds(List<Long> eligibleDepartmentIds) {
        this.eligibleDepartmentIds = eligibleDepartmentIds;
    }

    public List<Long> getEligibleCourseIds() {
        return eligibleCourseIds;
    }

    public void setEligibleCourseIds(List<Long> eligibleCourseIds) {
        this.eligibleCourseIds = eligibleCourseIds;
    }
}
