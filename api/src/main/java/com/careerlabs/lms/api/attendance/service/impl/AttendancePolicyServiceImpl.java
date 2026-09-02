package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.request.AttendancePolicyRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendancePolicyResponse;
import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;
import com.careerlabs.lms.api.attendance.repository.AttendancePolicyRepository;
import com.careerlabs.lms.api.attendance.service.AttendancePolicyService;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AttendancePolicyServiceImpl implements AttendancePolicyService {

    private static final int DEFAULT_HEALTHY_THRESHOLD = 75;
    private static final int DEFAULT_AT_RISK_THRESHOLD = 65;

    private final AttendancePolicyRepository attendancePolicyRepository;
    private final BatchRepository batchRepository;

    public AttendancePolicyServiceImpl(AttendancePolicyRepository attendancePolicyRepository, BatchRepository batchRepository) {
        this.attendancePolicyRepository = attendancePolicyRepository;
        this.batchRepository = batchRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AttendancePolicy getEffectivePolicy(Long batchId) {
        if (batchId != null) {
            Optional<AttendancePolicy> batchPolicy = attendancePolicyRepository.findByBatchId(batchId);
            if (batchPolicy.isPresent()) {
                return batchPolicy.get();
            }

            Long courseId = batchRepository.findById(batchId).map(Batch::getCourse).map(c -> c.getId()).orElse(null);
            if (courseId != null) {
                Optional<AttendancePolicy> coursePolicy = attendancePolicyRepository.findByCourseIdAndBatchIdIsNull(courseId);
                if (coursePolicy.isPresent()) {
                    return coursePolicy.get();
                }
            }
        }

        return attendancePolicyRepository.findByBatchIdIsNullAndCourseIdIsNull()
                .orElseGet(this::defaultPolicy);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendancePolicyResponse getEffectivePolicyResponse(Long batchId) {
        return AttendancePolicyResponse.from(getEffectivePolicy(batchId));
    }

    @Override
    @Transactional
    public AttendancePolicyResponse upsertPolicy(AttendancePolicyRequest request) {
        if (request.getHealthyThreshold() <= request.getAtRiskThreshold()) {
            throw new BadRequestException("Healthy threshold must be greater than the at-risk threshold");
        }

        AttendancePolicy policy = resolveExisting(request.getBatchId(), request.getCourseId())
                .orElseGet(AttendancePolicy::new);

        if (request.getBatchId() != null) {
            batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + request.getBatchId()));
        }

        policy.setBatchId(request.getBatchId());
        policy.setCourseId(request.getCourseId());
        policy.setHealthyThreshold(request.getHealthyThreshold());
        policy.setAtRiskThreshold(request.getAtRiskThreshold());

        AttendancePolicy saved = attendancePolicyRepository.save(policy);
        return AttendancePolicyResponse.from(saved);
    }

    private Optional<AttendancePolicy> resolveExisting(Long batchId, Long courseId) {
        if (batchId != null) {
            return attendancePolicyRepository.findByBatchId(batchId);
        }
        if (courseId != null) {
            return attendancePolicyRepository.findByCourseIdAndBatchIdIsNull(courseId);
        }
        return attendancePolicyRepository.findByBatchIdIsNullAndCourseIdIsNull();
    }

    private AttendancePolicy defaultPolicy() {
        AttendancePolicy policy = new AttendancePolicy();
        policy.setHealthyThreshold(DEFAULT_HEALTHY_THRESHOLD);
        policy.setAtRiskThreshold(DEFAULT_AT_RISK_THRESHOLD);
        return policy;
    }
}
