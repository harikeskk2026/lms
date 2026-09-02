package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Backs "scheduled publishing" (section 6) and the EXPIRED status (section 4) using Spring's
 * own @Scheduled infrastructure — no external scheduler/queue is introduced.
 */
@Component
public class AnnouncementSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(AnnouncementSchedulerService.class);

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementService announcementService;

    public AnnouncementSchedulerService(AnnouncementRepository announcementRepository,
                                         AnnouncementService announcementService) {
        this.announcementRepository = announcementRepository;
        this.announcementService = announcementService;
    }

    /** Every minute: publish any SCHEDULED announcement whose time has arrived. */
    @Scheduled(fixedDelay = 60_000)
    public void publishDueScheduled() {
        List<Announcement> due = announcementRepository
                .findByStatusAndScheduledAtLessThanEqual(AnnouncementStatus.SCHEDULED, Instant.now());
        for (Announcement announcement : due) {
            try {
                announcementService.publish(announcement.getId());
                log.info("Auto-published scheduled announcement {}", announcement.getId());
            } catch (Exception e) {
                log.warn("Failed to auto-publish scheduled announcement {}: {}", announcement.getId(), e.getMessage());
            }
        }
    }

    /** Every 5 minutes: flip PUBLISHED announcements past their expiry date to EXPIRED. Cosmetic only —
     *  visibility to students is already expiry-filtered regardless of this status flip. */
    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void expireStale() {
        List<Announcement> stale = announcementRepository
                .findByStatusAndExpiresAtLessThan(AnnouncementStatus.PUBLISHED, LocalDate.now());
        for (Announcement announcement : stale) {
            announcement.setStatus(AnnouncementStatus.EXPIRED);
            announcementRepository.save(announcement);
        }
    }
}
