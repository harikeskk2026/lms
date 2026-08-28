package com.careerlabs.lms.api.recordedsession.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Admin-imposed deny-list entry: this student may be enrolled in the course
 * but is explicitly barred from playing this one recorded session, without
 * touching their course enrollment.
 */
@Entity
@Table(name = "recorded_session_access_blocks",
        uniqueConstraints = @UniqueConstraint(columnNames = {"recorded_session_id", "student_user_id"}))
public class RecordedSessionAccessBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recorded_session_id", nullable = false)
    private Long recordedSessionId;

    @Column(name = "student_user_id", nullable = false)
    private Long studentUserId;

    @Column(name = "blocked_by")
    private Long blockedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getRecordedSessionId() {
        return recordedSessionId;
    }

    public void setRecordedSessionId(Long recordedSessionId) {
        this.recordedSessionId = recordedSessionId;
    }

    public Long getStudentUserId() {
        return studentUserId;
    }

    public void setStudentUserId(Long studentUserId) {
        this.studentUserId = studentUserId;
    }

    public Long getBlockedBy() {
        return blockedBy;
    }

    public void setBlockedBy(Long blockedBy) {
        this.blockedBy = blockedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
