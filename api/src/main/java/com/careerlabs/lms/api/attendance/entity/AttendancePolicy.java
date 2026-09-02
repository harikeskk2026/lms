package com.careerlabs.lms.api.attendance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "attendance_policies")
public class AttendancePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id")
    private Long batchId;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "healthy_threshold", nullable = false)
    private int healthyThreshold = 75;

    @Column(name = "at_risk_threshold", nullable = false)
    private int atRiskThreshold = 65;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
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

    public int getHealthyThreshold() {
        return healthyThreshold;
    }

    public void setHealthyThreshold(int healthyThreshold) {
        this.healthyThreshold = healthyThreshold;
    }

    public int getAtRiskThreshold() {
        return atRiskThreshold;
    }

    public void setAtRiskThreshold(int atRiskThreshold) {
        this.atRiskThreshold = atRiskThreshold;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
