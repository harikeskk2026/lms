package com.careerlabs.lms.api.student.repository;

import com.careerlabs.lms.api.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {

    boolean existsByEnrollmentNo(String enrollmentNo);

    List<Student> findByBatchId(Long batchId);

    Optional<Student> findByUserId(Long userId);
}
