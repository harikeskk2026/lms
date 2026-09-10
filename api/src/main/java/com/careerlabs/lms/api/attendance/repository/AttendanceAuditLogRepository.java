package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.AttendanceAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceAuditLogRepository extends JpaRepository<AttendanceAuditLog, Long> {

    List<AttendanceAuditLog> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<AttendanceAuditLog> findByDailyClassIdOrderByCreatedAtDesc(Long classId);

    List<AttendanceAuditLog> findByAttendanceIdOrderByCreatedAtDesc(Long attendanceId);

    List<AttendanceAuditLog> findTop100ByOrderByCreatedAtDesc();

    @Query("SELECT a FROM AttendanceAuditLog a WHERE " +
           "(:studentId IS NULL OR a.student.id = :studentId) AND " +
           "(:classId IS NULL OR a.dailyClass.id = :classId) " +
           "ORDER BY a.createdAt DESC")
    List<AttendanceAuditLog> searchAuditLogs(@Param("studentId") Long studentId,
                                            @Param("classId") Long classId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM AttendanceAuditLog a WHERE a.dailyClass.id = :classId")
    void deleteByDailyClassId(@Param("classId") Long classId);
}
