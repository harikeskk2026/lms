package com.careerlabs.lms.api.academic.dto.request;

import com.careerlabs.lms.api.academic.validation.AcademicValidationMessages;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class AcademicDetailsRequest {

    @Min(value = 1950, message = AcademicValidationMessages.YEAR_INVALID)
    @Max(value = 2100, message = AcademicValidationMessages.YEAR_INVALID)
    private Integer tenthYearOfPassing;

    @DecimalMin(value = "0", message = AcademicValidationMessages.PERCENTAGE_INVALID)
    @DecimalMax(value = "100", message = AcademicValidationMessages.PERCENTAGE_INVALID)
    private Double tenthPercentage;

    @Min(value = 1950, message = AcademicValidationMessages.YEAR_INVALID)
    @Max(value = 2100, message = AcademicValidationMessages.YEAR_INVALID)
    private Integer twelfthYearOfPassing;

    @DecimalMin(value = "0", message = AcademicValidationMessages.PERCENTAGE_INVALID)
    @DecimalMax(value = "100", message = AcademicValidationMessages.PERCENTAGE_INVALID)
    private Double twelfthPercentage;

    // Diploma is an optional education stage - no validation forces it to be filled in.
    @Min(value = 1950, message = AcademicValidationMessages.YEAR_INVALID)
    @Max(value = 2100, message = AcademicValidationMessages.YEAR_INVALID)
    private Integer diplomaYearOfPassing;

    @DecimalMin(value = "0", message = AcademicValidationMessages.PERCENTAGE_INVALID)
    @DecimalMax(value = "100", message = AcademicValidationMessages.PERCENTAGE_INVALID)
    private Double diplomaPercentage;

    private String ugDegree;

    private String ugDepartment;

    @Min(value = 1950, message = AcademicValidationMessages.YEAR_INVALID)
    @Max(value = 2100, message = AcademicValidationMessages.YEAR_INVALID)
    private Integer ugYearOfPassing;

    private AcademicScoreType ugScoreType;

    @DecimalMin(value = "0", message = AcademicValidationMessages.CGPA_OR_PERCENTAGE_INVALID)
    @DecimalMax(value = "100", message = AcademicValidationMessages.CGPA_OR_PERCENTAGE_INVALID)
    private Double ugScore;

    @Min(value = 0, message = AcademicValidationMessages.BACKLOGS_INVALID)
    private Integer ugBacklogs;

    // PG / Master's is an optional education stage - no validation forces it to be filled in.
    private String pgDegree;

    private String pgDepartment;

    @Min(value = 1950, message = AcademicValidationMessages.YEAR_INVALID)
    @Max(value = 2100, message = AcademicValidationMessages.YEAR_INVALID)
    private Integer pgYearOfPassing;

    private AcademicScoreType pgScoreType;

    @DecimalMin(value = "0", message = AcademicValidationMessages.CGPA_OR_PERCENTAGE_INVALID)
    @DecimalMax(value = "100", message = AcademicValidationMessages.CGPA_OR_PERCENTAGE_INVALID)
    private Double pgScore;

    @Min(value = 0, message = AcademicValidationMessages.BACKLOGS_INVALID)
    private Integer pgBacklogs;

    public Integer getTenthYearOfPassing() {
        return tenthYearOfPassing;
    }

    public void setTenthYearOfPassing(Integer tenthYearOfPassing) {
        this.tenthYearOfPassing = tenthYearOfPassing;
    }

    public Double getTenthPercentage() {
        return tenthPercentage;
    }

    public void setTenthPercentage(Double tenthPercentage) {
        this.tenthPercentage = tenthPercentage;
    }

    public Integer getTwelfthYearOfPassing() {
        return twelfthYearOfPassing;
    }

    public void setTwelfthYearOfPassing(Integer twelfthYearOfPassing) {
        this.twelfthYearOfPassing = twelfthYearOfPassing;
    }

    public Double getTwelfthPercentage() {
        return twelfthPercentage;
    }

    public void setTwelfthPercentage(Double twelfthPercentage) {
        this.twelfthPercentage = twelfthPercentage;
    }

    public Integer getDiplomaYearOfPassing() {
        return diplomaYearOfPassing;
    }

    public void setDiplomaYearOfPassing(Integer diplomaYearOfPassing) {
        this.diplomaYearOfPassing = diplomaYearOfPassing;
    }

    public Double getDiplomaPercentage() {
        return diplomaPercentage;
    }

    public void setDiplomaPercentage(Double diplomaPercentage) {
        this.diplomaPercentage = diplomaPercentage;
    }

    public String getUgDegree() {
        return ugDegree;
    }

    public void setUgDegree(String ugDegree) {
        this.ugDegree = ugDegree;
    }

    public String getUgDepartment() {
        return ugDepartment;
    }

    public void setUgDepartment(String ugDepartment) {
        this.ugDepartment = ugDepartment;
    }

    public Integer getUgYearOfPassing() {
        return ugYearOfPassing;
    }

    public void setUgYearOfPassing(Integer ugYearOfPassing) {
        this.ugYearOfPassing = ugYearOfPassing;
    }

    public AcademicScoreType getUgScoreType() {
        return ugScoreType;
    }

    public void setUgScoreType(AcademicScoreType ugScoreType) {
        this.ugScoreType = ugScoreType;
    }

    public Double getUgScore() {
        return ugScore;
    }

    public void setUgScore(Double ugScore) {
        this.ugScore = ugScore;
    }

    public Integer getUgBacklogs() {
        return ugBacklogs;
    }

    public void setUgBacklogs(Integer ugBacklogs) {
        this.ugBacklogs = ugBacklogs;
    }

    public String getPgDegree() {
        return pgDegree;
    }

    public void setPgDegree(String pgDegree) {
        this.pgDegree = pgDegree;
    }

    public String getPgDepartment() {
        return pgDepartment;
    }

    public void setPgDepartment(String pgDepartment) {
        this.pgDepartment = pgDepartment;
    }

    public Integer getPgYearOfPassing() {
        return pgYearOfPassing;
    }

    public void setPgYearOfPassing(Integer pgYearOfPassing) {
        this.pgYearOfPassing = pgYearOfPassing;
    }

    public AcademicScoreType getPgScoreType() {
        return pgScoreType;
    }

    public void setPgScoreType(AcademicScoreType pgScoreType) {
        this.pgScoreType = pgScoreType;
    }

    public Double getPgScore() {
        return pgScore;
    }

    public void setPgScore(Double pgScore) {
        this.pgScore = pgScore;
    }

    public Integer getPgBacklogs() {
        return pgBacklogs;
    }

    public void setPgBacklogs(Integer pgBacklogs) {
        this.pgBacklogs = pgBacklogs;
    }
}
