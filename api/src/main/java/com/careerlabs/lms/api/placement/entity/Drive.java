package com.careerlabs.lms.api.placement.entity;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.course.entity.Course;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * A placement opportunity. Eligibility is expressed entirely through the criteria
 * fields below (min*, max*, eligible* sets) - never hard-coded in application logic.
 * A null/empty criterion means "no restriction on that dimension". See
 * {@link com.careerlabs.lms.api.placement.service.PlacementEligibilityGuard}.
 */
@Entity
@Table(name = "drives")
public class Drive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(nullable = false)
    private String role;

    @Column(name = "package_offered")
    private String packageOffered;

    private String location;

    @Column(name = "drive_date", nullable = false)
    private LocalDate driveDate;

    @Column(name = "apply_deadline", nullable = false)
    private LocalDate applyDeadline;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    // EAGER: small, always-displayed alongside the drive itself - avoids
    // LazyInitializationException when serialized after the transaction/session
    // that loaded the Drive has closed (open-in-view is disabled project-wide).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "drive_requirements", joinColumns = @JoinColumn(name = "drive_id"))
    @Column(name = "requirement")
    private List<String> requirements = List.of();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "drive_skills", joinColumns = @JoinColumn(name = "drive_id"))
    @Column(name = "skill")
    private List<String> skills = List.of();

    @Enumerated(EnumType.STRING)
    @Column(name = "drive_type", nullable = false)
    private DriveType driveType = DriveType.CAMPUS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DriveStatus status = DriveStatus.UPCOMING;

    /** Informational company reference link only - never used by students to bypass the interest flow. */
    @Column(name = "apply_link")
    private String applyLink;

    @Column(name = "min_cgpa")
    private Double minCgpa;

    @Column(name = "min_percentage")
    private Double minPercentage;

    @Column(name = "max_backlogs")
    private Integer maxBacklogs;

    /** Modeled for forward-compatibility; not yet enforced - see PlacementEligibilityGuard javadoc. */
    @Column(name = "min_attendance_pct")
    private Double minAttendancePct;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "drive_batches",
            joinColumns = @JoinColumn(name = "drive_id"),
            inverseJoinColumns = @JoinColumn(name = "batch_id")
    )
    private Set<Batch> eligibleBatches = new LinkedHashSet<>();

    /** Also doubles as the LMS-integration link (Phase 5): which course(s) this opportunity relates to. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "drive_courses",
            joinColumns = @JoinColumn(name = "drive_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> eligibleCourses = new LinkedHashSet<>();

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

    public Long getId() {
        return id;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getPackageOffered() {
        return packageOffered;
    }

    public void setPackageOffered(String packageOffered) {
        this.packageOffered = packageOffered;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDate getDriveDate() {
        return driveDate;
    }

    public void setDriveDate(LocalDate driveDate) {
        this.driveDate = driveDate;
    }

    public LocalDate getApplyDeadline() {
        return applyDeadline;
    }

    public void setApplyDeadline(LocalDate applyDeadline) {
        this.applyDeadline = applyDeadline;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getRequirements() {
        return requirements;
    }

    public void setRequirements(List<String> requirements) {
        this.requirements = requirements;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public DriveType getDriveType() {
        return driveType;
    }

    public void setDriveType(DriveType driveType) {
        this.driveType = driveType;
    }

    public DriveStatus getStatus() {
        return status;
    }

    public void setStatus(DriveStatus status) {
        this.status = status;
    }

    public String getApplyLink() {
        return applyLink;
    }

    public void setApplyLink(String applyLink) {
        this.applyLink = applyLink;
    }

    public Double getMinCgpa() {
        return minCgpa;
    }

    public void setMinCgpa(Double minCgpa) {
        this.minCgpa = minCgpa;
    }

    public Double getMinPercentage() {
        return minPercentage;
    }

    public void setMinPercentage(Double minPercentage) {
        this.minPercentage = minPercentage;
    }

    public Integer getMaxBacklogs() {
        return maxBacklogs;
    }

    public void setMaxBacklogs(Integer maxBacklogs) {
        this.maxBacklogs = maxBacklogs;
    }

    public Double getMinAttendancePct() {
        return minAttendancePct;
    }

    public void setMinAttendancePct(Double minAttendancePct) {
        this.minAttendancePct = minAttendancePct;
    }

    public Set<Batch> getEligibleBatches() {
        return eligibleBatches;
    }

    public void setEligibleBatches(Set<Batch> eligibleBatches) {
        this.eligibleBatches = eligibleBatches;
    }

    public Set<Course> getEligibleCourses() {
        return eligibleCourses;
    }

    public void setEligibleCourses(Set<Course> eligibleCourses) {
        this.eligibleCourses = eligibleCourses;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
