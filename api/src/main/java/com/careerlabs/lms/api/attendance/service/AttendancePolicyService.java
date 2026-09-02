package com.careerlabs.lms.api.attendance.service;

import com.careerlabs.lms.api.attendance.dto.request.AttendancePolicyRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendancePolicyResponse;
import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;

public interface AttendancePolicyService {

    /**
     * Resolves the policy that applies to a batch: a batch-specific row, else the
     * batch's course-specific row, else the global row (batchId and courseId both null),
     * else an in-memory default (75 / 65) if no policy has ever been configured.
     */
    AttendancePolicy getEffectivePolicy(Long batchId);

    AttendancePolicyResponse getEffectivePolicyResponse(Long batchId);

    AttendancePolicyResponse upsertPolicy(AttendancePolicyRequest request);
}
