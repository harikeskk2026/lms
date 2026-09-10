package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.InterviewResource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewResourceRepository extends JpaRepository<InterviewResource, Long> {

    List<InterviewResource> findByActiveTrueOrderByIdAsc();

    long countByActiveTrue();
}