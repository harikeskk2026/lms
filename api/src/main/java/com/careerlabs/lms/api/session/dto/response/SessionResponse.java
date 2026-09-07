package com.careerlabs.lms.api.session.dto.response;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.entity.SessionType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record SessionResponse(
        Long id,
        Long topicId,
        Long moduleId,
        String title,
        String description,
        String trainerName,
        LocalDate sessionDate,
        LocalTime startTime,
        LocalTime endTime,
        Integer durationMinutes,
        SessionType type,
        String meetingUrl,
        String recordingUrl,
        CourseStatus status,
        int orderIndex,
        List<MaterialResponse> materials
) {

    public SessionResponse(Long id, Long topicId, Long moduleId, String title, String description,
                           String trainerName, LocalDate sessionDate, LocalTime startTime,
                           LocalTime endTime, Integer durationMinutes, SessionType type,
                           String meetingUrl, String recordingUrl, CourseStatus status, int orderIndex) {
        this(id, topicId, moduleId, title, description, trainerName, sessionDate, startTime,
                endTime, durationMinutes, type, meetingUrl, recordingUrl, status, orderIndex, List.of());
    }

    public static SessionResponse from(Session session) {
        return from(session, List.of());
    }

    public static SessionResponse from(Session session, List<MaterialResponse> materials) {
        return new SessionResponse(
                session.getId(),
                session.getTopic().getId(),
                session.getTopic().getModule().getId(),
                session.getTitle(),
                session.getDescription(),
                session.getTrainerName(),
                session.getSessionDate(),
                session.getStartTime(),
                session.getEndTime(),
                session.getDurationMinutes(),
                session.getType(),
                session.getMeetingUrl(),
                session.getRecordingUrl(),
                session.getStatus(),
                session.getOrderIndex(),
                materials != null ? materials : List.of());
    }
}
