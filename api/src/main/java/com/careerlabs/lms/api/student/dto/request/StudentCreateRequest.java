package com.careerlabs.lms.api.student.dto.request;

import com.careerlabs.lms.api.auth.validation.annotation.ValidEmailFormat;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.validation.StudentValidationMessages;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class StudentCreateRequest {

    @NotBlank(message = StudentValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = StudentValidationMessages.NAME_SIZE)
    private String name;

    @NotBlank(message = StudentValidationMessages.EMAIL_REQUIRED)
    @Email(message = StudentValidationMessages.EMAIL_INVALID)
    @ValidEmailFormat
    private String email;

    private String phone;

    @NotBlank(message = StudentValidationMessages.PASSWORD_REQUIRED)
    @Size(min = 8, max = 128, message = StudentValidationMessages.PASSWORD_SIZE)
    private String password;

    private Long batchId;

    private Long collegeId;

    private Long courseId;

    private AcademicScoreType academicScoreType;

    @DecimalMin(value = "0", message = StudentValidationMessages.ACADEMIC_SCORE_INVALID)
    @DecimalMax(value = "100", message = StudentValidationMessages.ACADEMIC_SCORE_INVALID)
    private Double academicScore;

    @Min(value = 1950, message = StudentValidationMessages.PASSED_OUT_YEAR_INVALID)
    @Max(value = 2100, message = StudentValidationMessages.PASSED_OUT_YEAR_INVALID)
    private Integer passedOutYear;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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
}
