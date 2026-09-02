package com.careerlabs.lms.api.recordedsession.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class HeartbeatRequest {

    @NotNull(message = "Position is required")
    @Min(value = 0, message = "Position must be at least {value}")
    private Integer positionSeconds;

    public Integer getPositionSeconds() {
        return positionSeconds;
    }

    public void setPositionSeconds(Integer positionSeconds) {
        this.positionSeconds = positionSeconds;
    }
}
