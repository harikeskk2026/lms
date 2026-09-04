package com.careerlabs.lms.api.attendance.service;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceVerificationResponse;

public interface AttendanceVerificationService {

    /**
     * Looks up whether the student behind this correction request actually joined a
     * Scheduled Class (Zoom) meeting for the same batch on the same day as the
     * disputed class — evidence the admin can use to decide the correction.
     */
    AttendanceVerificationResponse verify(Long correctionId);
}
