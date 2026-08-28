package com.careerlabs.lms.api.announcement.entity;

import com.careerlabs.lms.api.student.entity.Student;
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

@Entity
@Table(name = "announcement_acknowledgments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"announcement_id", "student_id"}))
public class AnnouncementAcknowledgment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "announcement_id", nullable = false)
    private Announcement announcement;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "acknowledged_at", nullable = false, updatable = false)
    private Instant acknowledgedAt;

    @PrePersist
    void onCreate() {
        acknowledgedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Announcement getAnnouncement() {
        return announcement;
    }

    public void setAnnouncement(Announcement announcement) {
        this.announcement = announcement;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public Instant getAcknowledgedAt() {
        return acknowledgedAt;
    }
}
