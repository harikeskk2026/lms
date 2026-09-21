package com.careerlabs.lms.api.announcement.entity;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.course.entity.Course;
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
import jakarta.persistence.ManyToMany;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "announcements")
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    /** Null means "all students". */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "announcement_batches",
            joinColumns = @JoinColumn(name = "announcement_id"),
            inverseJoinColumns = @JoinColumn(name = "batch_id")
    )
    private Set<Batch> batches = new HashSet<>();

    @Column(name = "is_pinned", nullable = false)
    private boolean pinned = false;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'GENERAL'")
    private AnnouncementCategory category = AnnouncementCategory.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'PUBLISHED'")
    private AnnouncementStatus status = AnnouncementStatus.PUBLISHED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'NORMAL'")
    private AnnouncementPriority priority = AnnouncementPriority.NORMAL;

    /** Set together with status=SCHEDULED; the scheduler publishes automatically once this passes. */
    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "requires_acknowledgment", nullable = false)
    @ColumnDefault("false")
    private boolean requiresAcknowledgment = false;

    @Column(name = "allow_comments", nullable = false)
    @ColumnDefault("false")
    private boolean allowComments = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type")
    private AnnouncementActionType actionType;

    @Column(name = "action_reference_id")
    private Long actionReferenceId;

    @Column(name = "action_label")
    private String actionLabel;

    /** Only used when actionType = CUSTOM. */
    @Column(name = "action_url")
    private String actionUrl;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "attachment_name")
    private String attachmentName;


    /** Additional targeting filters, combined (AND) with batch and each other. All optional. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "college_id")
    private College college;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "announcement_courses",
            joinColumns = @JoinColumn(name = "announcement_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "audience_rule_type", nullable = false)
    @ColumnDefault("'NONE'")
    private AudienceRuleType audienceRuleType = AudienceRuleType.NONE;

    /** Numeric threshold for rules like ATTENDANCE_BELOW (percentage). */
    @Column(name = "audience_rule_value")
    private Double audienceRuleValue;

    /** Reference id for rules like ASSIGNMENT_NOT_SUBMITTED (the assignment id). */
    @Column(name = "audience_rule_reference_id")
    private Long audienceRuleReferenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Batch getBatch() {
        return batch;
    }

    public void setBatch(Batch batch) {
        this.batch = batch;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public AnnouncementCategory getCategory() {
        return category;
    }

    public void setCategory(AnnouncementCategory category) {
        this.category = category;
    }

    public AnnouncementStatus getStatus() {
        return status;
    }

    public void setStatus(AnnouncementStatus status) {
        this.status = status;
    }

    public AnnouncementPriority getPriority() {
        return priority;
    }

    public void setPriority(AnnouncementPriority priority) {
        this.priority = priority;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public boolean isRequiresAcknowledgment() {
        return requiresAcknowledgment;
    }

    public void setRequiresAcknowledgment(boolean requiresAcknowledgment) {
        this.requiresAcknowledgment = requiresAcknowledgment;
    }

    public boolean isAllowComments() {
        return allowComments;
    }

    public void setAllowComments(boolean allowComments) {
        this.allowComments = allowComments;
    }

    public AnnouncementActionType getActionType() {
        return actionType;
    }

    public void setActionType(AnnouncementActionType actionType) {
        this.actionType = actionType;
    }

    public Long getActionReferenceId() {
        return actionReferenceId;
    }

    public void setActionReferenceId(Long actionReferenceId) {
        this.actionReferenceId = actionReferenceId;
    }

    public String getActionLabel() {
        return actionLabel;
    }

    public void setActionLabel(String actionLabel) {
        this.actionLabel = actionLabel;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public String getAttachmentUrl() {
        return attachmentUrl;
    }

    public void setAttachmentUrl(String attachmentUrl) {
        this.attachmentUrl = attachmentUrl;
    }

    public String getAttachmentName() {
        return attachmentName;
    }

    public void setAttachmentName(String attachmentName) {
        this.attachmentName = attachmentName;
    }


    public College getCollege() {
        return college;
    }

    public void setCollege(College college) {
        this.college = college;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public Set<Batch> getBatches() {
        return batches;
    }

    public void setBatches(Set<Batch> batches) {
        this.batches = batches != null ? batches : new HashSet<>();
    }

    public Set<Course> getCourses() {
        return courses;
    }

    public void setCourses(Set<Course> courses) {
        this.courses = courses != null ? courses : new HashSet<>();
    }

    public List<Long> getBatchIds() {
        if (batches != null && !batches.isEmpty()) {
            return batches.stream().map(Batch::getId).filter(Objects::nonNull).toList();
        }
        return batch != null && batch.getId() != null ? List.of(batch.getId()) : List.of();
    }

    public List<Long> getCourseIds() {
        if (courses != null && !courses.isEmpty()) {
            return courses.stream().map(Course::getId).filter(Objects::nonNull).toList();
        }
        return course != null && course.getId() != null ? List.of(course.getId()) : List.of();
    }

    public AudienceRuleType getAudienceRuleType() {
        return audienceRuleType;
    }

    public void setAudienceRuleType(AudienceRuleType audienceRuleType) {
        this.audienceRuleType = audienceRuleType;
    }

    public Double getAudienceRuleValue() {
        return audienceRuleValue;
    }

    public void setAudienceRuleValue(Double audienceRuleValue) {
        this.audienceRuleValue = audienceRuleValue;
    }

    public Long getAudienceRuleReferenceId() {
        return audienceRuleReferenceId;
    }

    public void setAudienceRuleReferenceId(Long audienceRuleReferenceId) {
        this.audienceRuleReferenceId = audienceRuleReferenceId;
    }

    public User getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(User approvedBy) {
        this.approvedBy = approvedBy;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
