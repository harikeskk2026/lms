package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.AttendanceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceAlertRepository extends JpaRepository<AttendanceAlert, Long> {

    List<AttendanceAlert> findByIsResolvedOrderByCurrentPctAsc(boolean isResolved);

    List<AttendanceAlert> findByBatchIdAndIsResolvedOrderByCurrentPctAsc(Long batchId, boolean isResolved);

    Optional<AttendanceAlert> findFirstByStudentIdAndBatchIdAndIsResolvedFalse(Long studentId, Long batchId);

    void deleteAllByStudentId(Long studentId);
}
