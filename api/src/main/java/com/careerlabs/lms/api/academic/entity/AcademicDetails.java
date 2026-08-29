package com.careerlabs.lms.api.academic.entity;

import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.entity.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A student's academic history (10th through PG), persisted separately from the
 * core {@link Student} profile. This is the single source of truth the Placement
 * module reads from for eligibility checks - see
 * {@code com.careerlabs.lms.api.placement.service.PlacementEligibilityGuard}.
 * Diploma and PG are optional education stages; every field on them is nullable.
 */
@Entity
@Table(name = "academic_details")
public class AcademicDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, unique = true)
    private Student student;

    @Column(name = "tenth_year_of_passing")
    private Integer tenthYearOfPassing;

    @Column(name = "tenth_percentage")
    private Double tenthPercentage;

    @Column(name = "twelfth_year_of_passing")
    private Integer twelfthYearOfPassing;

    @Column(name = "twelfth_percentage")
    private Double twelfthPercentage;

    @Column(name = "diploma_year_of_passing")
    private Integer diplomaYearOfPassing;

    @Column(name = "diploma_percentage")
    private Double diplomaPercentage;

    @Column(name = "ug_degree")
    private String ugDegree;

    @Column(name = "ug_department")
    private String ugDepartment;

    @Column(name = "ug_year_of_passing")
    private Integer ugYearOfPassing;

    @Enumerated(EnumType.STRING)
    @Column(name = "ug_score_type")
    private AcademicScoreType ugScoreType;

    @Column(name = "ug_score")
    private Double ugScore;

    @Column(name = "ug_backlogs")
    private Integer ugBacklogs;

    @Column(name = "pg_degree")
    private String pgDegree;

    @Column(name = "pg_department")
    private String pgDepartment;

    @Column(name = "pg_year_of_passing")
    private Integer pgYearOfPassing;

    @Enumerated(EnumType.STRING)
    @Column(name = "pg_score_type")
    private AcademicScoreType pgScoreType;

    @Column(name = "pg_score")
    private Double pgScore;

    @Column(name = "pg_backlogs")
    private Integer pgBacklogs;

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

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public Integer getTenthYearOfPassing() {
        return tenthYearOfPassing;
    }

    public void setTenthYearOfPassing(Integer tenthYearOfPassing) {
        this.tenthYearOfPassing = tenthYearOfPassing;
    }

    public Double getTenthPercentage() {
        return tenthPercentage;
    }

    public void setTenthPercentage(Double tenthPercentage) {
        this.tenthPercentage = tenthPercentage;
    }

    public Integer getTwelfthYearOfPassing() {
        return twelfthYearOfPassing;
    }

    public void setTwelfthYearOfPassing(Integer twelfthYearOfPassing) {
        this.twelfthYearOfPassing = twelfthYearOfPassing;
    }

    public Double getTwelfthPercentage() {
        return twelfthPercentage;
    }

    public void setTwelfthPercentage(Double twelfthPercentage) {
        this.twelfthPercentage = twelfthPercentage;
    }

    public Integer getDiplomaYearOfPassing() {
        return diplomaYearOfPassing;
    }

    public void setDiplomaYearOfPassing(Integer diplomaYearOfPassing) {
        this.diplomaYearOfPassing = diplomaYearOfPassing;
    }

    public Double getDiplomaPercentage() {
        return diplomaPercentage;
    }

    public void setDiplomaPercentage(Double diplomaPercentage) {
        this.diplomaPercentage = diplomaPercentage;
    }

    public String getUgDegree() {
        return ugDegree;
    }

    public void setUgDegree(String ugDegree) {
        this.ugDegree = ugDegree;
    }

    public String getUgDepartment() {
        return ugDepartment;
    }

    public void setUgDepartment(String ugDepartment) {
        this.ugDepartment = ugDepartment;
    }

    public Integer getUgYearOfPassing() {
        return ugYearOfPassing;
    }

    public void setUgYearOfPassing(Integer ugYearOfPassing) {
        this.ugYearOfPassing = ugYearOfPassing;
    }

    public AcademicScoreType getUgScoreType() {
        return ugScoreType;
    }

    public void setUgScoreType(AcademicScoreType ugScoreType) {
        this.ugScoreType = ugScoreType;
    }

    public Double getUgScore() {
        return ugScore;
    }

    public void setUgScore(Double ugScore) {
        this.ugScore = ugScore;
    }

    public Integer getUgBacklogs() {
        return ugBacklogs;
    }

    public void setUgBacklogs(Integer ugBacklogs) {
        this.ugBacklogs = ugBacklogs;
    }

    public String getPgDegree() {
        return pgDegree;
    }

    public void setPgDegree(String pgDegree) {
        this.pgDegree = pgDegree;
    }

    public String getPgDepartment() {
        return pgDepartment;
    }

    public void setPgDepartment(String pgDepartment) {
        this.pgDepartment = pgDepartment;
    }

    public Integer getPgYearOfPassing() {
        return pgYearOfPassing;
    }

    public void setPgYearOfPassing(Integer pgYearOfPassing) {
        this.pgYearOfPassing = pgYearOfPassing;
    }

    public AcademicScoreType getPgScoreType() {
        return pgScoreType;
    }

    public void setPgScoreType(AcademicScoreType pgScoreType) {
        this.pgScoreType = pgScoreType;
    }

    public Double getPgScore() {
        return pgScore;
    }

    public void setPgScore(Double pgScore) {
        this.pgScore = pgScore;
    }

    public Integer getPgBacklogs() {
        return pgBacklogs;
    }

    public void setPgBacklogs(Integer pgBacklogs) {
        this.pgBacklogs = pgBacklogs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
