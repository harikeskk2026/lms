package com.careerlabs.lms.api.placement.entity;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A named step within a placement drive's interview process (e.g. Round 1 -
 * Aptitude, Round 2 - Technical). Rounds belong to a Drive and are ordered by
 * {@link #sequence}. Configuration is per-round: name, type, description,
 * pass threshold, online/offline, duration.
 */
@Entity
@Table(name = "interview_rounds")
public class InterviewRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "drive_id", nullable = false)
    private Drive drive;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "round_type", nullable = false)
    private InterviewRoundType roundType = InterviewRoundType.TECHNICAL;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "minimum_score")
    private Double minimumScore;

    @Column(name = "max_score")
    private Double maxScore;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "is_online")
    private Boolean online = true;

    @Column(name = "location_link")
    private String locationLink;

    @Column(name = "created_by")
    private Long createdBy;

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

    public Long getId() { return id; }
    public Drive getDrive() { return drive; }
    public void setDrive(Drive drive) { this.drive = drive; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public InterviewRoundType getRoundType() { return roundType; }
    public void setRoundType(InterviewRoundType roundType) { this.roundType = roundType; }
    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Double getMinimumScore() { return minimumScore; }
    public void setMinimumScore(Double minimumScore) { this.minimumScore = minimumScore; }
    public Double getMaxScore() { return maxScore; }
    public void setMaxScore(Double maxScore) { this.maxScore = maxScore; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Boolean getOnline() { return online; }
    public void setOnline(Boolean online) { this.online = online; }
    public String getLocationLink() { return locationLink; }
    public void setLocationLink(String locationLink) { this.locationLink = locationLink; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}