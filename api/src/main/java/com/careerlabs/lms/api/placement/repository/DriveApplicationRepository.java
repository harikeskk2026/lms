package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.DriveApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DriveApplicationRepository extends JpaRepository<DriveApplication, Long> {

    boolean existsByDrive_IdAndStudent_Id(Long driveId, Long studentId);

    Optional<DriveApplication> findByDrive_IdAndStudent_Id(Long driveId, Long studentId);

    List<DriveApplication> findAllByStudent_IdOrderByCreatedAtDesc(Long studentId);

    List<DriveApplication> findAllByDrive_IdOrderByCreatedAtDesc(Long driveId);

    Optional<DriveApplication> findByIdAndDrive_Id(Long id, Long driveId);

    long countByDrive_Id(Long driveId);

    long countByStudent_Id(Long studentId);

    @Query("SELECT a.drive.id, COUNT(a) FROM DriveApplication a WHERE a.drive.id IN :driveIds GROUP BY a.drive.id")
    List<Object[]> countGroupedByDriveId(@Param("driveIds") List<Long> driveIds);

    @Query("SELECT COUNT(DISTINCT a.student.id) FROM DriveApplication a")
    long countDistinctStudents();

    void deleteAllByStudent_Id(Long studentId);

    void deleteAllByDrive_Id(Long driveId);
}
