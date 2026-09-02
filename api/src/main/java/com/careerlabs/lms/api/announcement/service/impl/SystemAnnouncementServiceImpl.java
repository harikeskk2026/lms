package com.careerlabs.lms.api.announcement.service.impl;

import org.springframework.stereotype.Service;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import com.careerlabs.lms.api.announcement.service.SystemAnnouncementService;

@Service
public class SystemAnnouncementServiceImpl implements SystemAnnouncementService {

    private final AnnouncementService announcementService;

    public SystemAnnouncementServiceImpl(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @Override
    public AnnouncementResponse createSystemAnnouncement(String title, String body, AnnouncementCategory category,
                                                           AnnouncementPriority priority, Long batchId, Long systemUserId) {
        AnnouncementRequest request = new AnnouncementRequest(
                title, body, batchId, false, null,
                category, AnnouncementStatus.PUBLISHED, priority, null,
                false, false, null, null, null, null,
                null, null,  null, null, null);
        return announcementService.create(request, systemUserId);
    }
}
