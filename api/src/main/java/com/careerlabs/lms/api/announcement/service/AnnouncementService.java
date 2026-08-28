package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementRequest;
import com.careerlabs.lms.api.announcement.dto.request.ScheduleRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementAnalyticsResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementSuggestionResponse;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementVersionResponse;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;

import java.util.List;

public interface AnnouncementService {

    /** All announcements, pinned first then newest first — for the admin list view. Optional status filter. */
    List<AnnouncementResponse> list(AnnouncementStatus statusFilter);

    /** Announcements visible to a given student: matches their targeting + not expired, personalized. */
    List<AnnouncementResponse> listForStudent(Long userId);

    AnnouncementResponse create(AnnouncementRequest request, Long createdByUserId);

    AnnouncementResponse update(Long id, AnnouncementRequest request, Long changedByUserId);

    /** Publishes a DRAFT/SCHEDULED/PENDING_APPROVAL announcement immediately, firing the notification fan-out. */
    AnnouncementResponse publish(Long id);

    /** Sets status=SCHEDULED with the given future time; the scheduler publishes it automatically. */
    AnnouncementResponse schedule(Long id, ScheduleRequest request);

    /** Moves DRAFT -> PENDING_APPROVAL. */
    AnnouncementResponse submitForApproval(Long id);

    /** Approves a PENDING_APPROVAL announcement: publishes immediately, or moves to SCHEDULED if scheduledAt is set. */
    AnnouncementResponse approve(Long id, Long approverUserId);

    /** Rejects a PENDING_APPROVAL announcement back to DRAFT. */
    AnnouncementResponse reject(Long id);

    /** Creates a new DRAFT copy of an existing announcement. */
    AnnouncementResponse duplicate(Long id, Long createdByUserId);

    void delete(Long id);

    AnnouncementAnalyticsResponse analytics(Long id);

    List<AnnouncementVersionResponse> history(Long id);

    /** Records that a student has seen an announcement (idempotent). */
    void recordView(Long announcementId, Long userId);

    /** Records a student's acknowledgment (idempotent, requires requiresAcknowledgment=true). */
    AnnouncementResponse acknowledge(Long announcementId, Long userId);

    /** Rule-based draft suggestions (e.g. batches with low attendance) for the admin to review and create. */
    List<AnnouncementSuggestionResponse> suggestions();
}
