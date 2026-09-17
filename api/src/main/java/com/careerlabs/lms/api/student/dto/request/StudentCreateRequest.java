package com.careerlabs.lms.api.student.dto.request;

import com.careerlabs.lms.api.auth.validation.annotation.ValidEmailFormat;
import com.careerlabs.lms.api.auth.validation.annotation.ValidPassword;
import com.careerlabs.lms.api.auth.validation.annotation.ValidPhoneNumber;
import com.careerlabs.lms.api.student.validation.StudentValidationMessages;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class StudentCreateRequest {

    @NotBlank(message = StudentValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = StudentValidationMessages.NAME_SIZE)
    private String name;

    @NotBlank(message = StudentValidationMessages.EMAIL_REQUIRED)
    @Email(message = StudentValidationMessages.EMAIL_INVALID)
    @ValidEmailFormat
    private String email;

    @ValidPhoneNumber
    private String phone;

    @NotBlank(message = StudentValidationMessages.PASSWORD_REQUIRED)
    @Size(min = 8, max = 128, message = StudentValidationMessages.PASSWORD_SIZE)
    @ValidPassword
    private String password;

    private Long batchId;

    private Long courseId;

    private List<StudentCourseBatchAssignment> courseBatchAssignments;

    private String collegeName;

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

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public List<StudentCourseBatchAssignment> getCourseBatchAssignments() {
        return courseBatchAssignments;
    }

    public void setCourseBatchAssignments(List<StudentCourseBatchAssignment> courseBatchAssignments) {
        this.courseBatchAssignments = courseBatchAssignments;
    }

    public String getCollegeName() {
        return collegeName;
    }

    public void setCollegeName(String collegeName) {
        this.collegeName = collegeName;
    }
}