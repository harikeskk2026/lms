package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.AttendanceGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttendanceGoalRepository extends JpaRepository<AttendanceGoal, Long> {

    Optional<AttendanceGoal> findByStudentId(Long studentId);

    void deleteByStudentId(Long studentId);
}
