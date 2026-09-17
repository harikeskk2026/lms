package com.careerlabs.lms.api.trainer.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TrainerCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phone;
    private String designation;
    private String department;
    private Long courseId;
    private Long batchId;
    private java.util.List<Long> batchIds;
    private java.util.List<CourseBatchAssignment> courseBatchAssignments;

    public TrainerCreateRequest() {
    }

    public TrainerCreateRequest(String name, String email, String password, String phone, String designation, String department) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.designation = designation;
        this.department = department;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public java.util.List<Long> getBatchIds() {
        return batchIds;
    }

    public void setBatchIds(java.util.List<Long> batchIds) {
        this.batchIds = batchIds;
    }

    public java.util.List<CourseBatchAssignment> getCourseBatchAssignments() {
        return courseBatchAssignments;
    }

    public void setCourseBatchAssignments(java.util.List<CourseBatchAssignment> courseBatchAssignments) {
        this.courseBatchAssignments = courseBatchAssignments;
    }

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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }
}
