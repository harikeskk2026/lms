package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.PlacementInterview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlacementInterviewRepository
        extends JpaRepository<PlacementInterview, Long>, JpaSpecificationExecutor<PlacementInterview> {
    List<PlacementInterview> findByDrive_IdOrderByScheduledAtAsc(Long driveId);
    List<PlacementInterview> findByStudent_IdOrderByScheduledAtDesc(Long studentId);
    List<PlacementInterview> findByStudent_IdAndDrive_IdOrderByScheduledAtAsc(Long studentId, Long driveId);
    List<PlacementInterview> findByRound_IdOrderByScheduledAtAsc(Long roundId);
    Optional<PlacementInterview> findByIdAndDriveId(Long id, Long driveId);

    /**
     * Clears the interviewer_id (nullable) on interviews under a drive that
     * belongs to someone else - used when deleting the interviewer's own
     * account so we don't fail with an FK violation on an interview we don't
     * otherwise own or need to touch.
     */
    @Modifying
    @Query("UPDATE PlacementInterview p SET p.interviewer = NULL WHERE p.interviewer.id = :userId")
    void clearInterviewerByUserId(@Param("userId") Long userId);
}