package com.careerlabs.lms.api.student.dto.request;

import com.careerlabs.lms.api.auth.validation.annotation.ValidEmailFormat;
import com.careerlabs.lms.api.student.validation.StudentValidationMessages;
import jakarta.validation.constraints.Email;
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

    private Long departmentId;

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

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }
}
