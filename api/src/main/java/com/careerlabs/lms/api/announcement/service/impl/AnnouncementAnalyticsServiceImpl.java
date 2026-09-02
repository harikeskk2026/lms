package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.dto.response.AnnouncementAnalyticsResponse;
import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementAnalyticsService;
import com.careerlabs.lms.api.announcement.service.AnnouncementAudienceService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnouncementAnalyticsServiceImpl implements AnnouncementAnalyticsService {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementAudienceService audienceService;
    private final AnnouncementViewRepository viewRepository;
    private final AnnouncementAcknowledgmentRepository acknowledgmentRepository;

    public AnnouncementAnalyticsServiceImpl(AnnouncementRepository announcementRepository,
                                             AnnouncementAudienceService audienceService,
                                             AnnouncementViewRepository viewRepository,
                                             AnnouncementAcknowledgmentRepository acknowledgmentRepository) {
        this.announcementRepository = announcementRepository;
        this.audienceService = audienceService;
        this.viewRepository = viewRepository;
        this.acknowledgmentRepository = acknowledgmentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AnnouncementAnalyticsResponse analyticsFor(Long announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        long targeted = audienceService.resolveEligibleStudents(announcement).size();
        long viewed = viewRepository.countByAnnouncementId(announcementId);
        long acknowledged = acknowledgmentRepository.countByAnnouncementId(announcementId);

        return AnnouncementAnalyticsResponse.of(targeted, viewed, acknowledged, announcement.isRequiresAcknowledgment());
    }
}
