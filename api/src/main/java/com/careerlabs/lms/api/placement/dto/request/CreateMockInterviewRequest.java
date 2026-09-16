package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.MockInterviewMode;
import com.careerlabs.lms.api.placement.entity.MockInterviewSelection;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class CreateMockInterviewRequest {

    @NotNull(message = "mode is required")
    private MockInterviewMode mode;

    private String scheduledAt;

    @Min(1)
    @Max(600)
    private Integer durationMinutes;

    private String interviewerName;

    private String meetLink;

    private String location;

    private MockInterviewSelection selectionType = MockInterviewSelection.MANUAL;

    private List<Long> studentIds;

    private List<Long> batchIds;

    private List<Long> courseIds;

    @Min(1)
    private Integer randomCount;

    private String syllabus;

    private String instructions;

    private List<Long> preparationMaterialIds;

    public MockInterviewMode getMode() {
        return mode;
    }

    public void setMode(MockInterviewMode mode) {
        this.mode = mode;
    }

    @JsonSetter("mode")
    public void setModeRaw(Object mode) {
        if (mode instanceof String str && !str.isBlank()) {
            this.mode = MockInterviewMode.valueOf(str.trim().toUpperCase());
        } else if (mode instanceof MockInterviewMode m) {
            this.mode = m;
        }
    }

    public String getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(String scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    @JsonSetter("durationMinutes")
    public void setDurationMinutesRaw(Object durationMinutes) {
        if (durationMinutes instanceof Number number) {
            this.durationMinutes = number.intValue();
        } else if (durationMinutes instanceof String str && !str.isBlank()) {
            this.durationMinutes = Integer.parseInt(str.trim());
        }
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

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public MockInterviewSelection getSelectionType() {
        return selectionType;
    }

    public void setSelectionType(MockInterviewSelection selectionType) {
        this.selectionType = selectionType;
    }

    @JsonSetter("selectionType")
    public void setSelectionTypeRaw(Object selectionType) {
        if (selectionType instanceof String str && !str.isBlank()) {
            this.selectionType = MockInterviewSelection.valueOf(str.trim().toUpperCase());
        } else if (selectionType instanceof MockInterviewSelection s) {
            this.selectionType = s;
        }
    }

    public List<Long> getStudentIds() {
        return studentIds;
    }

    public void setStudentIds(List<Long> studentIds) {
        this.studentIds = studentIds;
    }

    public List<Long> getBatchIds() {
        return batchIds;
    }

    public void setBatchIds(List<Long> batchIds) {
        this.batchIds = batchIds;
    }

    public List<Long> getCourseIds() {
        return courseIds;
    }

    public void setCourseIds(List<Long> courseIds) {
        this.courseIds = courseIds;
    }

    public Integer getRandomCount() {
        return randomCount;
    }

    public void setRandomCount(Integer randomCount) {
        this.randomCount = randomCount;
    }

    @JsonSetter("randomCount")
    public void setRandomCountRaw(Object randomCount) {
        if (randomCount instanceof Number number) {
            this.randomCount = number.intValue();
        } else if (randomCount instanceof String str && !str.isBlank()) {
            this.randomCount = Integer.parseInt(str.trim());
        }
    }

    public String getSyllabus() {
        return syllabus;
    }

    public void setSyllabus(String syllabus) {
        this.syllabus = syllabus;
    }

    public String getInstructions() {
        return instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public List<Long> getPreparationMaterialIds() {
        return preparationMaterialIds;
    }

    public void setPreparationMaterialIds(List<Long> preparationMaterialIds) {
        this.preparationMaterialIds = preparationMaterialIds;
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