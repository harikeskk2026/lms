package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.MockInterview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MockInterviewRepository extends JpaRepository<MockInterview, Long> {
    List<MockInterview> findAllByOrderByScheduledAtDesc();
    List<MockInterview> findByStudent_IdOrderByScheduledAtDesc(Long studentId);
    long countByStudent_Id(Long studentId);
}
