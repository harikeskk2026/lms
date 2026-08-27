package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.ResumeData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResumeDataRepository extends JpaRepository<ResumeData, Long> {

    Optional<ResumeData> findByStudent_Id(Long studentId);
}
