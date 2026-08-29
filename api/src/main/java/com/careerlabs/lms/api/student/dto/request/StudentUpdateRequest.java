package com.careerlabs.lms.api.student.dto.request;

import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.validation.StudentValidationMessages;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    private AcademicScoreType academicScoreType;

    @DecimalMin(value = "0", message = StudentValidationMessages.ACADEMIC_SCORE_INVALID)
    @DecimalMax(value = "100", message = StudentValidationMessages.ACADEMIC_SCORE_INVALID)
    private Double academicScore;

    @Min(value = 1950, message = StudentValidationMessages.PASSED_OUT_YEAR_INVALID)
    @Max(value = 2100, message = StudentValidationMessages.PASSED_OUT_YEAR_INVALID)
    private Integer passedOutYear;

    private String linkedinUrl;

    private String githubUrl;

    @NotNull(message = StudentValidationMessages.PLACEMENT_STATUS_REQUIRED)
    private PlacementStatus placementStatus;

    private Double cgpa;

    private Double percentage;

    private Integer backlogs;

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

    public AcademicScoreType getAcademicScoreType() {
        return academicScoreType;
    }

    public void setAcademicScoreType(AcademicScoreType academicScoreType) {
        this.academicScoreType = academicScoreType;
    }

    public Double getAcademicScore() {
        return academicScore;
    }

    public void setAcademicScore(Double academicScore) {
        this.academicScore = academicScore;
    }

    public Integer getPassedOutYear() {
        return passedOutYear;
    }

    public void setPassedOutYear(Integer passedOutYear) {
        this.passedOutYear = passedOutYear;
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

    public Double getCgpa() {
        return cgpa;
    }

    public void setCgpa(Double cgpa) {
        this.cgpa = cgpa;
    }

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public Integer getBacklogs() {
        return backlogs;
    }

    public void setBacklogs(Integer backlogs) {
        this.backlogs = backlogs;
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
