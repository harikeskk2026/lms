package com.careerlabs.lms.api.trainer.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class TrainerUpdateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String designation;
    private String department;
    private Long courseId;
    private Long batchId;
    private List<Long> batchIds;
    private List<CourseBatchAssignment> courseBatchAssignments;

    public TrainerUpdateRequest() {
    }

    public TrainerUpdateRequest(String name, String email, String phone, String designation, String department) {
        this.name = name;
        this.email = email;
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

    public List<Long> getBatchIds() {
        return batchIds;
    }

    public void setBatchIds(List<Long> batchIds) {
        this.batchIds = batchIds;
    }

    public List<CourseBatchAssignment> getCourseBatchAssignments() {
        return courseBatchAssignments;
    }

    public void setCourseBatchAssignments(List<CourseBatchAssignment> courseBatchAssignments) {
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
