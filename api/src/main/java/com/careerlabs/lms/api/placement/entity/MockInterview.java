package com.careerlabs.lms.api.placement.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "mock_interviews")
public class MockInterview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MockInterviewMode mode;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "interviewer_name")
    private String interviewerName;

    @Column(name = "meet_link", length = 1000)
    private String meetLink;

    @Column(length = 1000)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MockInterviewStatus status = MockInterviewStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String syllabus;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @OneToMany(mappedBy = "mockInterview", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MockInterviewCandidate> candidates = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "mock_interview_prep_materials",
            joinColumns = @JoinColumn(name = "mock_interview_id"),
            inverseJoinColumns = @JoinColumn(name = "preparation_material_id"))
    private Set<PreparationMaterial> preparationMaterials = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MockInterviewMode getMode() { return mode; }
    public void setMode(MockInterviewMode mode) { this.mode = mode; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getInterviewerName() { return interviewerName; }
    public void setInterviewerName(String interviewerName) { this.interviewerName = interviewerName; }

    public String getMeetLink() { return meetLink; }
    public void setMeetLink(String meetLink) { this.meetLink = meetLink; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public MockInterviewStatus getStatus() { return status; }
    public void setStatus(MockInterviewStatus status) { this.status = status; }

    public String getSyllabus() { return syllabus; }
    public void setSyllabus(String syllabus) { this.syllabus = syllabus; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public List<MockInterviewCandidate> getCandidates() { return candidates; }
    public void setCandidates(List<MockInterviewCandidate> candidates) { this.candidates = candidates; }

    public Set<PreparationMaterial> getPreparationMaterials() { return preparationMaterials; }
    public void setPreparationMaterials(Set<PreparationMaterial> preparationMaterials) { this.preparationMaterials = preparationMaterials; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}