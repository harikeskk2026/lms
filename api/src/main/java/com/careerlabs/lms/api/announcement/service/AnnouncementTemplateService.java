package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementTemplateRequest;
import com.careerlabs.lms.api.announcement.dto.request.ApplyTemplateRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementTemplateResponse;
import com.careerlabs.lms.api.announcement.dto.response.ResolvedTemplateResponse;

import java.util.List;

public interface AnnouncementTemplateService {

    List<AnnouncementTemplateResponse> list();

    AnnouncementTemplateResponse create(AnnouncementTemplateRequest request, Long createdByUserId);

    AnnouncementTemplateResponse update(Long id, AnnouncementTemplateRequest request);

    void delete(Long id);

    ResolvedTemplateResponse apply(ApplyTemplateRequest request);
}
