package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.RiskLevel;

public record AttendanceHealthResponse(
        int overallPercentage,
        int currentPercentage,
        int previousPercentage,
        int improvement,
        RiskLevel riskLevel
) {
    public AttendanceHealthResponse(int currentPercentage, int previousPercentage, int improvement, RiskLevel riskLevel) {
        this(currentPercentage, currentPercentage, previousPercentage, improvement, riskLevel);
    }
}
