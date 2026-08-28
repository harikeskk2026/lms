package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    List<Announcement> findAllByOrderByPinnedDescCreatedAtDesc();

    List<Announcement> findByStatus(AnnouncementStatus status);

    /** Due-for-publish scan for the scheduler. */
    List<Announcement> findByStatusAndScheduledAtLessThanEqual(AnnouncementStatus status, Instant now);

    /** Due-for-expiry scan for the scheduler (cosmetic status flip; visibility is already expiry-filtered). */
    List<Announcement> findByStatusAndExpiresAtLessThan(AnnouncementStatus status, LocalDate today);
}
