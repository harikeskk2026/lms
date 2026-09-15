package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long>, JpaSpecificationExecutor<Attendance> {

    List<Attendance> findByDailyClassId(Long classId);

    List<Attendance> findByStudentId(Long studentId);

    List<Attendance> findByStudentIdIn(List<Long> studentIds);

    Optional<Attendance> findByStudentIdAndDailyClassId(Long studentId, Long classId);

    List<Attendance> findByDailyClassBatchId(Long batchId);

    List<Attendance> findByStudentIdAndDailyClassBatchId(Long studentId, Long batchId);

    @Query("SELECT a FROM Attendance a JOIN FETCH a.dailyClass c WHERE a.student.id = :studentId ORDER BY c.date DESC")
    List<Attendance> findByStudentIdOrderByDailyClassDateDesc(@Param("studentId") Long studentId);

    @Query("SELECT a FROM Attendance a JOIN FETCH a.dailyClass c WHERE a.dailyClass.id IN :classIds")
    List<Attendance> findByDailyClassIdIn(@Param("classIds") List<Long> classIds);

    long countByStudentIdAndStatus(Long studentId, AttendStatus status);

    long countByStudentId(Long studentId);

    void deleteAllByStudentId(Long studentId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Attendance a WHERE a.dailyClass.id = :classId")
    void deleteByDailyClassId(@Param("classId") Long classId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "INSERT INTO attendances (student_id, class_id, status, marked_at, marked_by, remarks) " +
            "VALUES (:studentId, :classId, :status, :markedAt, :markedBy, :remarks) " +
            "ON CONFLICT (student_id, class_id) DO UPDATE " +
            "SET status = EXCLUDED.status, " +
            "    marked_at = EXCLUDED.marked_at, " +
            "    marked_by = EXCLUDED.marked_by, " +
            "    remarks = EXCLUDED.remarks", nativeQuery = true)
    void upsertAttendance(@Param("studentId") Long studentId,
                          @Param("classId") Long classId,
                          @Param("status") String status,
                          @Param("markedAt") java.time.Instant markedAt,
                          @Param("markedBy") Long markedBy,
                          @Param("remarks") String remarks);
}
