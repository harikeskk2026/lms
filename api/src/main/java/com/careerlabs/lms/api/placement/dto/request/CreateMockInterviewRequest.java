package com.careerlabs.lms.api.placement.dto.request;

import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class CreateMockInterviewRequest {

    @NotNull(message = "studentId is required")
    private Long studentId;

    private String scheduledAt;

    private String interviewerName;

    private String meetLink;

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    @JsonSetter("studentId")
    public void setStudentIdRaw(Object studentId) {
        if (studentId instanceof Number number) {
            this.studentId = number.longValue();
        } else if (studentId instanceof String str && !str.isBlank()) {
            this.studentId = Long.parseLong(str.trim());
        }
    }

    public String getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(String scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public String getInterviewerName() {
        return interviewerName;
    }

    public void setInterviewerName(String interviewerName) {
        this.interviewerName = interviewerName;
    }

    public String getMeetLink() {
        return meetLink;
    }

    public void setMeetLink(String meetLink) {
        this.meetLink = meetLink;
    }

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
