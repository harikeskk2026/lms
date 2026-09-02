package com.careerlabs.lms.api.academic.repository;

import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AcademicDetailsRepository extends JpaRepository<AcademicDetails, Long> {

    Optional<AcademicDetails> findByStudentId(Long studentId);
}
