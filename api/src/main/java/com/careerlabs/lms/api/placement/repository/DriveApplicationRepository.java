package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.DriveApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriveApplicationRepository extends JpaRepository<DriveApplication, Long> {

    boolean existsByDrive_IdAndStudent_Id(Long driveId, Long studentId);

    Optional<DriveApplication> findByDrive_IdAndStudent_Id(Long driveId, Long studentId);

    List<DriveApplication> findAllByStudent_IdOrderByCreatedAtDesc(Long studentId);

    List<DriveApplication> findAllByDrive_IdOrderByCreatedAtDesc(Long driveId);

    Optional<DriveApplication> findByIdAndDrive_Id(Long id, Long driveId);
}
