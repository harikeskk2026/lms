package com.careerlabs.lms.api.trainer.dto.response;

import com.careerlabs.lms.api.user.entity.User;

import java.time.Instant;

public class TrainerResponse {

    private Long id;
    private String name;
    private String email;
    private String phone;
    private String designation;
    private String department;
    private String photoUrl;
    private boolean active;
    private Instant createdAt;
    private Instant lastLoginAt;

    public TrainerResponse() {
    }

    public static TrainerResponse from(User user) {
        TrainerResponse response = new TrainerResponse();
        response.id = user.getId();
        response.name = user.getName();
        response.email = user.getEmail();
        response.phone = user.getPhone();
        response.designation = user.getDesignation();
        response.department = user.getDepartment();
        response.photoUrl = user.getPhotoUrl();
        response.active = user.isActive();
        response.createdAt = user.getCreatedAt();
        response.lastLoginAt = user.getLastLoginAt();
        return response;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getDesignation() {
        return designation;
    }

    public String getDepartment() {
        return department;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }
}
