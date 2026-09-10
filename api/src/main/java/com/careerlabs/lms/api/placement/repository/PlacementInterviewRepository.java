package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.PlacementInterview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlacementInterviewRepository extends JpaRepository<PlacementInterview, Long> {
    List<PlacementInterview> findByDrive_IdOrderByScheduledAtAsc(Long driveId);
    List<PlacementInterview> findByStudent_IdOrderByScheduledAtDesc(Long studentId);
    List<PlacementInterview> findByStudent_IdAndDrive_IdOrderByScheduledAtAsc(Long studentId, Long driveId);
    List<PlacementInterview> findByRound_IdOrderByScheduledAtAsc(Long roundId);
    Optional<PlacementInterview> findByIdAndDriveId(Long id, Long driveId);
}