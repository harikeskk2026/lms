package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttendancePolicyRepository extends JpaRepository<AttendancePolicy, Long> {

    Optional<AttendancePolicy> findByBatchId(Long batchId);

    Optional<AttendancePolicy> findByCourseIdAndBatchIdIsNull(Long courseId);

    Optional<AttendancePolicy> findByBatchIdIsNullAndCourseIdIsNull();
}
