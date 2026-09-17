package com.careerlabs.lms.api.student.dto.request;

import com.careerlabs.lms.api.auth.validation.annotation.ValidPhoneNumber;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.validation.StudentValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Admin-side student update - deliberately does NOT include address,
 * qualification, linkedinUrl, githubUrl, or collegeId. Those are now managed
 * exclusively by the student themselves via {@code PUT /api/profile} (My
 * Profile), so this request must never overwrite them - see
 * StudentServiceImpl.applyRequest().
 */
public class StudentUpdateRequest {

    @NotBlank(message = StudentValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = StudentValidationMessages.NAME_SIZE)
    private String name;

    @ValidPhoneNumber
    private String phone;

    @NotNull(message = StudentValidationMessages.PLACEMENT_STATUS_REQUIRED)
    private PlacementStatus placementStatus;

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

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
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
