package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;

/**
 * Extension point (section 14) for other modules to raise system-generated announcements
 * (e.g. "assignment deadline approaching", "placement drive created") without coupling
 * directly to AnnouncementController. Not wired into any other module yet — callers can be
 * added later as an explicit, separate change.
 */
public interface SystemAnnouncementService {

    AnnouncementResponse createSystemAnnouncement(String title, String body, AnnouncementCategory category,
                                                   AnnouncementPriority priority, Long batchId, Long systemUserId);
}
