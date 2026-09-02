package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;

public record AttendancePolicyResponse(
        Long id,
        Long batchId,
        Long courseId,
        int healthyThreshold,
        int atRiskThreshold
) {

    public static AttendancePolicyResponse from(AttendancePolicy policy) {
        return new AttendancePolicyResponse(
                policy.getId(),
                policy.getBatchId(),
                policy.getCourseId(),
                policy.getHealthyThreshold(),
                policy.getAtRiskThreshold());
    }
}
