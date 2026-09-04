package com.careerlabs.lms.api.meeting.dto.request;

import com.careerlabs.lms.api.meeting.entity.MeetingPlatform;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class CreateMeetingLinkRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotBlank(message = "Meeting URL is required")
    private String meetUrl;

    private MeetingPlatform platform = MeetingPlatform.ZOOM;

    private Long batchId;

    private Long courseId;

    private Long dailyClassId;

    private String hostName;

    @NotNull(message = "Scheduled start time is required")
    private LocalDateTime scheduledStart;

    private LocalDateTime scheduledEnd;

    private String passcode;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getMeetUrl() {
        return meetUrl;
    }

    public void setMeetUrl(String meetUrl) {
        this.meetUrl = meetUrl;
    }

    public MeetingPlatform getPlatform() {
        return platform;
    }

    public void setPlatform(MeetingPlatform platform) {
        this.platform = platform;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Long getDailyClassId() {
        return dailyClassId;
    }

    public void setDailyClassId(Long dailyClassId) {
        this.dailyClassId = dailyClassId;
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public LocalDateTime getScheduledStart() {
        return scheduledStart;
    }

    public void setScheduledStart(LocalDateTime scheduledStart) {
        this.scheduledStart = scheduledStart;
    }

    public LocalDateTime getScheduledEnd() {
        return scheduledEnd;
    }

    public void setScheduledEnd(LocalDateTime scheduledEnd) {
        this.scheduledEnd = scheduledEnd;
    }

    public String getPasscode() {
        return passcode;
    }

    public void setPasscode(String passcode) {
        this.passcode = passcode;
    }
}
