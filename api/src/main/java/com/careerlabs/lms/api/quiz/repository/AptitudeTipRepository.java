package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.AptitudeTip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AptitudeTipRepository extends JpaRepository<AptitudeTip, Long> {

    List<AptitudeTip> findByActiveTrueOrderByIdAsc();

    long countByActiveTrue();
}