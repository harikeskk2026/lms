package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.MockInterview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MockInterviewRepository
        extends JpaRepository<MockInterview, Long>, JpaSpecificationExecutor<MockInterview> {
    List<MockInterview> findAllByOrderByScheduledAtDesc();
}
