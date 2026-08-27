package com.careerlabs.lms.api.session.dto.response;

import com.careerlabs.lms.api.session.entity.Session;

import java.time.LocalDate;
import java.time.LocalTime;

public record SessionResponse(
        Long id,
        Long topicId,
        String title,
        String description,
        String trainerName,
        LocalDate sessionDate,
        LocalTime sessionTime,
        Integer durationMinutes,
        String meetingUrl,
        String recordingUrl,
        int orderIndex
) {

    public static SessionResponse from(Session session) {
        return new SessionResponse(
                session.getId(),
                session.getTopic().getId(),
                session.getTitle(),
                session.getDescription(),
                session.getTrainerName(),
                session.getSessionDate(),
                session.getSessionTime(),
                session.getDurationMinutes(),
                session.getMeetingUrl(),
                session.getRecordingUrl(),
                session.getOrderIndex());
    }
}
