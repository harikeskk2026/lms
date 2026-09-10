package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.Placement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlacementRepository extends JpaRepository<Placement, Long> {

    List<Placement> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
    Optional<Placement> findByStudent_IdAndDrive_Id(Long studentId, Long driveId);
    boolean existsByStudent_Id(Long studentId);
    List<Placement> findAllByOrderByCreatedAtDesc();
}