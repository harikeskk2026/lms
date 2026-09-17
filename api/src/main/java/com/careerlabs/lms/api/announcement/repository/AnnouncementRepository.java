package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    List<Announcement> findAllByOrderByPinnedDescCreatedAtDesc();

    List<Announcement> findByCreatedBy_Id(Long createdById);

    /**
     * Clears approved_by (nullable) on announcements approved by a deleted admin
     * but authored by someone else - the announcement itself isn't going away,
     * so we honestly drop the approver reference rather than fabricate a new one.
     */
    @Modifying
    @Query("UPDATE Announcement a SET a.approvedBy = NULL WHERE a.approvedBy.id = :userId")
    void clearApprovedByUserId(@Param("userId") Long userId);

    List<Announcement> findByStatus(AnnouncementStatus status);
 
    long countByStatus(AnnouncementStatus status);

    @Query("SELECT a FROM Announcement a WHERE a.status = :status AND (a.expiresAt IS NULL OR a.expiresAt >= :today) ORDER BY a.pinned DESC, a.createdAt DESC")
    List<Announcement> findActiveByStatus(@Param("status") AnnouncementStatus status, @Param("today") LocalDate today);

    /** Due-for-publish scan for the scheduler. */
    List<Announcement> findByStatusAndScheduledAtLessThanEqual(AnnouncementStatus status, Instant now);

    /** Due-for-expiry scan for the scheduler (cosmetic status flip; visibility is already expiry-filtered). */
    List<Announcement> findByStatusAndExpiresAtLessThan(AnnouncementStatus status, LocalDate today);
}
