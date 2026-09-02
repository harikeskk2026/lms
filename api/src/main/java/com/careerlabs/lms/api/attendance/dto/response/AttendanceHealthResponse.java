package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.RiskLevel;

public record AttendanceHealthResponse(
        int currentPercentage,
        int previousPercentage,
        int improvement,
        RiskLevel riskLevel
) {
}
