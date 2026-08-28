package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.entity.AssignmentTargetType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public class AssignQuizRequest {

    @NotNull(message = "Target type is required")
    private AssignmentTargetType targetType;

    @NotEmpty(message = "At least one target must be selected")
    private List<Long> targetIds;

    private LocalDateTime availableFrom;

    private LocalDateTime availableUntil;

    public AssignmentTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(AssignmentTargetType targetType) {
        this.targetType = targetType;
    }

    public List<Long> getTargetIds() {
        return targetIds;
    }

    public void setTargetIds(List<Long> targetIds) {
        this.targetIds = targetIds;
    }

    public LocalDateTime getAvailableFrom() {
        return availableFrom;
    }

    public void setAvailableFrom(LocalDateTime availableFrom) {
        this.availableFrom = availableFrom;
    }

    public LocalDateTime getAvailableUntil() {
        return availableUntil;
    }

    public void setAvailableUntil(LocalDateTime availableUntil) {
        this.availableUntil = availableUntil;
    }
}
