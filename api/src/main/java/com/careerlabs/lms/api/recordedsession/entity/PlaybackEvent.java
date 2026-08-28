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

@Entity
@Table(name = "playback_events")
public class PlaybackEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "playback_session_id", nullable = false)
    private PlaybackSession playbackSession;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private PlaybackEventType eventType;

    @Column(name = "position_seconds")
    private Integer positionSeconds;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @PrePersist
    void onCreate() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public PlaybackSession getPlaybackSession() {
        return playbackSession;
    }

    public void setPlaybackSession(PlaybackSession playbackSession) {
        this.playbackSession = playbackSession;
    }

    public PlaybackEventType getEventType() {
        return eventType;
    }

    public void setEventType(PlaybackEventType eventType) {
        this.eventType = eventType;
    }

    public Integer getPositionSeconds() {
        return positionSeconds;
    }

    public void setPositionSeconds(Integer positionSeconds) {
        this.positionSeconds = positionSeconds;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}
