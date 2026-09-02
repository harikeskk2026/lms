package com.careerlabs.lms.api.profile.dto.request;

import com.careerlabs.lms.api.profile.validation.ProfileValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Common + role-conditional editable profile fields. Role/status/email/last-login
 * are never included here - they're read-only, sourced straight from the account
 * record, and can't be changed through this endpoint. Which of the role-conditional
 * fields actually get persisted is decided server-side in ProfileServiceImpl based
 * on the caller's own role (never a role supplied by the client).
 */
public class UpdateProfileRequest {

    @NotBlank(message = ProfileValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = ProfileValidationMessages.NAME_SIZE)
    private String name;

    private String phone;

    // STUDENT-only fields - ignored server-side for non-student accounts.
    private String address;
    private String qualification;
    private String linkedinUrl;
    private String githubUrl;

    // ADMIN/TRAINER/SUPERADMIN-only fields - ignored server-side for students.
    private String designation;
    private String department;

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
