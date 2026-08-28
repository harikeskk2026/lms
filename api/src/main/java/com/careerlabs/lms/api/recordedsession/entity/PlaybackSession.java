package com.careerlabs.lms.api.recordedsession.entity;

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
 * One row per (student, device) actively watching a {@link RecordedSession}.
 * Re-checked on every segment/key request — revoking a row takes effect
 * immediately, independent of whether its playback token has expired yet.
 */
@Entity
@Table(name = "playback_sessions")
public class PlaybackSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** User id — matches how the Quiz module keys attempts by user id, not Student.id. */
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_session_id", nullable = false)
    private RecordedSession recordedSession;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "last_activity", nullable = false)
    private Instant lastActivity;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "last_position_seconds")
    private int lastPositionSeconds = 0;

    @Column(name = "watch_duration_seconds")
    private int watchDurationSeconds = 0;

    @Column(name = "completion_percentage")
    private int completionPercentage = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlaybackSessionStatus status = PlaybackSessionStatus.ACTIVE;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (startedAt == null) startedAt = now;
        lastActivity = now;
    }

    public Long getId() {
        return id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public RecordedSession getRecordedSession() {
        return recordedSession;
    }

    public void setRecordedSession(RecordedSession recordedSession) {
        this.recordedSession = recordedSession;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getLastActivity() {
        return lastActivity;
    }

    public void setLastActivity(Instant lastActivity) {
        this.lastActivity = lastActivity;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public int getLastPositionSeconds() {
        return lastPositionSeconds;
    }

    public void setLastPositionSeconds(int lastPositionSeconds) {
        this.lastPositionSeconds = lastPositionSeconds;
    }

    public int getWatchDurationSeconds() {
        return watchDurationSeconds;
    }

    public void setWatchDurationSeconds(int watchDurationSeconds) {
        this.watchDurationSeconds = watchDurationSeconds;
    }

    public int getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(int completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public PlaybackSessionStatus getStatus() {
        return status;
    }

    public void setStatus(PlaybackSessionStatus status) {
        this.status = status;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
}
