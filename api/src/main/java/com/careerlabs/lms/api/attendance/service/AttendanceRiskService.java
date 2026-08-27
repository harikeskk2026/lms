package com.careerlabs.lms.api.attendance.service;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceHealthResponse;
import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;
import com.careerlabs.lms.api.attendance.entity.RiskLevel;

public interface AttendanceRiskService {

    RiskLevel classify(int percentage, AttendancePolicy policy);

    AttendanceHealthResponse getHealth(Long userId);
}
