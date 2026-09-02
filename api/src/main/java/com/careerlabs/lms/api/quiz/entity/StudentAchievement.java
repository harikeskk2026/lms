package com.careerlabs.lms.api.quiz.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "student_achievements", uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "code"}))
public class StudentAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AchievementCode code;

    @Column(name = "unlocked_at", nullable = false)
    private Instant unlockedAt;

    @PrePersist
    void onCreate() {
        if (unlockedAt == null) {
            unlockedAt = Instant.now();
        }
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

    public AchievementCode getCode() {
        return code;
    }

    public void setCode(AchievementCode code) {
        this.code = code;
    }

    public Instant getUnlockedAt() {
        return unlockedAt;
    }
}
