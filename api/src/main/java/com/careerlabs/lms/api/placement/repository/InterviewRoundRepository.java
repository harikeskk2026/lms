package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.InterviewRound;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewRoundRepository extends JpaRepository<InterviewRound, Long> {
    List<InterviewRound> findByDrive_IdOrderBySequenceAsc(Long driveId);
}