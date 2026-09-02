package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.dto.response.AnnouncementAnalyticsResponse;

public interface AnnouncementAnalyticsService {

    AnnouncementAnalyticsResponse analyticsFor(Long announcementId);
}
