package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.PlacementInterview;

import java.time.Instant;

/** View of a scheduled placement interview for a candidate. */
public record PlacementInterviewResponse(
        Long id,
        Long driveId,
        String companyName,
        String driveRole,
        Long roundId,
        String roundName,
        Long studentId,
        String studentName,
        Long interviewerId,
        String interviewerName,
        Instant scheduledAt,
        String meetingLink,
        String location,
        Boolean online,
        String status,
        String result,
        String notes,
        String feedback,
        Double score,
        Instant createdAt
) {

    public static PlacementInterviewResponse from(PlacementInterview interview) {
        return new PlacementInterviewResponse(
                interview.getId(),
                interview.getDrive().getId(),
                interview.getDrive().getCompanyName(),
                interview.getDrive().getRole(),
                interview.getRound().getId(),
                interview.getRound().getName(),
                interview.getStudent().getId(),
                interview.getStudent().getUser().getName(),
                interview.getInterviewer() != null ? interview.getInterviewer().getId() : null,
                interview.getInterviewer() != null ? interview.getInterviewer().getName() : null,
                interview.getScheduledAt(),
                interview.getMeetingLink(),
                interview.getLocation(),
                interview.getOnline(),
                interview.getStatus().name(),
                interview.getResult() != null ? interview.getResult().name() : null,
                interview.getNotes(),
                interview.getFeedback(),
                interview.getScore(),
                interview.getCreatedAt());
    }
}