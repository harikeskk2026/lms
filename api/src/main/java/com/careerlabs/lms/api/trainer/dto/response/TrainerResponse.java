package com.careerlabs.lms.api.trainer.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.user.entity.User;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
    private List<BatchSummary> batches = new ArrayList<>();

    public record BatchSummary(
            Long id,
            String name,
            String courseTitle,
            String timing,
            String mode,
            boolean active
    ) {
        public static BatchSummary from(Batch batch) {
            String courseTitle = (batch.getCourse() != null) ? batch.getCourse().getTitle() : null;
            String modeStr = (batch.getMode() != null) ? batch.getMode().name() : null;
            return new BatchSummary(
                    batch.getId(),
                    batch.getName(),
                    courseTitle,
                    batch.getTiming(),
                    modeStr,
                    batch.isActive()
            );
        }
    }

    public TrainerResponse() {
    }

    public static TrainerResponse from(User user) {
        return from(user, List.of());
    }

    public static TrainerResponse from(User user, List<Batch> batches) {
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
        if (batches != null && !batches.isEmpty()) {
            response.batches = batches.stream().map(BatchSummary::from).toList();
        }
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

    public List<BatchSummary> getBatches() {
        return batches;
    }

    public void setBatches(List<BatchSummary> batches) {
        this.batches = batches;
    }
}
