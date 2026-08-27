package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, Long> {

    List<AttendanceCorrection> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<AttendanceCorrection> findByStatusOrderByCreatedAtDesc(CorrectionStatus status);

    List<AttendanceCorrection> findAllByOrderByCreatedAtDesc();

    Optional<AttendanceCorrection> findFirstByAttendanceIdAndStatus(Long attendanceId, CorrectionStatus status);
}
