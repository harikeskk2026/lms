package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementCommentRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementCommentResponse;

import java.util.List;

public interface AnnouncementCommentService {

    List<AnnouncementCommentResponse> list(Long announcementId);

    AnnouncementCommentResponse add(Long announcementId, AnnouncementCommentRequest request, Long userId);
}
