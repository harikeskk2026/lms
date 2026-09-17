package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.InterviewEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewEvaluationRepository extends JpaRepository<InterviewEvaluation, Long> {
    List<InterviewEvaluation> findByInterview_IdOrderByCreatedAtDesc(Long interviewId);
    List<InterviewEvaluation> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
    long countByEvaluator_Id(Long evaluatorId);
}