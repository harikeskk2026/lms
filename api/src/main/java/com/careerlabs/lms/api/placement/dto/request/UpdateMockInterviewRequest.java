package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.MockInterviewMode;
import com.careerlabs.lms.api.placement.entity.MockInterviewStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

public record UpdateMockInterviewRequest(
    MockInterviewMode mode,
    String scheduledAt,
    Integer durationMinutes,
    String interviewerName,
    String meetLink,
    String location,
    String syllabus,
    String instructions,
    MockInterviewStatus status,
    List<Long> preparationMaterialIds
) {
    public Instant parseScheduledAt() {
        if (scheduledAt == null || scheduledAt.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(scheduledAt);
        } catch (Exception e1) {
            try {
                if (scheduledAt.length() == 16) {
                    return LocalDateTime.parse(scheduledAt, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"))
                            .atZone(ZoneId.systemDefault()).toInstant();
                }
                return LocalDateTime.parse(scheduledAt, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        .atZone(ZoneId.systemDefault()).toInstant();
            } catch (Exception e2) {
                return null;
            }
        }
    }
}