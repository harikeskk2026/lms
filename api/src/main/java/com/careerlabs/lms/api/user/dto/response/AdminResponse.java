package com.careerlabs.lms.api.user.dto.response;

import com.careerlabs.lms.api.user.entity.User;

import java.time.Instant;

public class AdminResponse {

    private Long id;
    private String name;
    private String email;
    private String role;
    private boolean active;
    private String phone;
    private String designation;
    private String department;
    private String photoUrl;
    private Instant createdAt;
    private Instant lastLoginAt;

    public AdminResponse() {}

    public static AdminResponse from(User user) {
        AdminResponse r = new AdminResponse();
        r.id = user.getId();
        r.name = user.getName();
        r.email = user.getEmail();
        r.role = user.getRole().name();
        r.active = user.isActive();
        r.phone = user.getPhone();
        r.designation = user.getDesignation();
        r.department = user.getDepartment();
        r.photoUrl = user.getPhotoUrl();
        r.createdAt = user.getCreatedAt();
        r.lastLoginAt = user.getLastLoginAt();
        return r;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public boolean isActive() { return active; }
    public String getPhone() { return phone; }
    public String getDesignation() { return designation; }
    public String getDepartment() { return department; }
    public String getPhotoUrl() { return photoUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
}
