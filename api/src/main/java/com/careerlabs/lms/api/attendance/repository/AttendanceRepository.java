package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long>, JpaSpecificationExecutor<Attendance> {

    List<Attendance> findByDailyClassId(Long classId);

    List<Attendance> findByStudentId(Long studentId);

    Optional<Attendance> findByStudentIdAndDailyClassId(Long studentId, Long classId);

    List<Attendance> findByDailyClassBatchId(Long batchId);

    List<Attendance> findByStudentIdAndDailyClassBatchId(Long studentId, Long batchId);

    @Query("SELECT a FROM Attendance a JOIN FETCH a.dailyClass c WHERE a.student.id = :studentId ORDER BY c.date DESC")
    List<Attendance> findByStudentIdOrderByDailyClassDateDesc(@Param("studentId") Long studentId);

    @Query("SELECT a FROM Attendance a JOIN FETCH a.dailyClass c WHERE a.dailyClass.id IN :classIds")
    List<Attendance> findByDailyClassIdIn(@Param("classIds") List<Long> classIds);

    long countByStudentIdAndStatus(Long studentId, AttendStatus status);

    long countByStudentId(Long studentId);
}
