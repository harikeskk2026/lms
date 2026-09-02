package com.careerlabs.lms.api.placement.entity;

import com.careerlabs.lms.api.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Immutable audit trail of every status transition a {@link DriveApplication}
 * goes through - one row per transition, never updated after creation. The
 * initial INTERESTED row has a null fromStatus.
 */
@Entity
@Table(name = "drive_application_status_history")
public class DriveApplicationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private DriveApplication application;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private DriveApplicationStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private DriveApplicationStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        changedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public DriveApplication getApplication() {
        return application;
    }

    public void setApplication(DriveApplication application) {
        this.application = application;
    }

    public DriveApplicationStatus getFromStatus() {
        return fromStatus;
    }

    public void setFromStatus(DriveApplicationStatus fromStatus) {
        this.fromStatus = fromStatus;
    }

    public DriveApplicationStatus getToStatus() {
        return toStatus;
    }

    public void setToStatus(DriveApplicationStatus toStatus) {
        this.toStatus = toStatus;
    }

    public User getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(User changedBy) {
        this.changedBy = changedBy;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Instant getChangedAt() {
        return changedAt;
    }
}
