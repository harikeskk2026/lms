package com.careerlabs.lms.api.meeting.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Records that a student clicked "Join Meeting" for a {@link MeetingLink} — the closest
 * signal the platform has to real attendance, since the actual Zoom session runs outside
 * the app. One row per (meeting, student); repeated clicks just bump {@code joinCount}
 * and {@code lastJoinedAt} instead of creating duplicates.
 */
@Entity
@Table(name = "meeting_attendees", uniqueConstraints = {
        @UniqueConstraint(name = "uk_meeting_attendee", columnNames = {"meeting_id", "student_user_id"})
})
public class MeetingAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meeting_id", nullable = false)
    private MeetingLink meeting;

    @Column(name = "student_user_id", nullable = false)
    private Long studentUserId;

    @Column(name = "first_joined_at", nullable = false, updatable = false)
    private Instant firstJoinedAt;

    @Column(name = "last_joined_at", nullable = false)
    private Instant lastJoinedAt;

    @Column(name = "join_count", nullable = false)
    private int joinCount = 1;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (firstJoinedAt == null) {
            firstJoinedAt = now;
        }
        lastJoinedAt = now;
    }

    public Long getId() {
        return id;
    }

    public MeetingLink getMeeting() {
        return meeting;
    }

    public void setMeeting(MeetingLink meeting) {
        this.meeting = meeting;
    }

    public Long getStudentUserId() {
        return studentUserId;
    }

    public void setStudentUserId(Long studentUserId) {
        this.studentUserId = studentUserId;
    }

    public Instant getFirstJoinedAt() {
        return firstJoinedAt;
    }

    public Instant getLastJoinedAt() {
        return lastJoinedAt;
    }

    public void setLastJoinedAt(Instant lastJoinedAt) {
        this.lastJoinedAt = lastJoinedAt;
    }

    public int getJoinCount() {
        return joinCount;
    }

    public void setJoinCount(int joinCount) {
        this.joinCount = joinCount;
    }
}
