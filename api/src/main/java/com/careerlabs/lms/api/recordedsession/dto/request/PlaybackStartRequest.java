package com.careerlabs.lms.api.recordedsession.dto.request;

import jakarta.validation.constraints.NotBlank;

public class PlaybackStartRequest {

    @NotBlank(message = "Device id is required")
    private String deviceId;

    /** When true, revoke any other active playback session for this student instead of rejecting. */
    private boolean forceTakeover = false;

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public boolean isForceTakeover() {
        return forceTakeover;
    }

    public void setForceTakeover(boolean forceTakeover) {
        this.forceTakeover = forceTakeover;
    }
}
