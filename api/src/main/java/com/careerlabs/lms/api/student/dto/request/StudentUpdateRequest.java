package com.careerlabs.lms.api.student.dto.request;

import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.validation.StudentValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class StudentUpdateRequest {

    @NotBlank(message = StudentValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = StudentValidationMessages.NAME_SIZE)
    private String name;

    private String phone;

    private String address;

    private String qualification;

    private String linkedinUrl;

    private String githubUrl;

    @NotNull(message = StudentValidationMessages.PLACEMENT_STATUS_REQUIRED)
    private PlacementStatus placementStatus;

    private Long batchId;

    private Long collegeId;

    private Long courseId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getQualification() {
        return qualification;
    }

    public void setQualification(String qualification) {
        this.qualification = qualification;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public PlacementStatus getPlacementStatus() {
        return placementStatus;
    }

    public void setPlacementStatus(PlacementStatus placementStatus) {
        this.placementStatus = placementStatus;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public Long getCollegeId() {
        return collegeId;
    }

    public void setCollegeId(Long collegeId) {
        this.collegeId = collegeId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }
}
