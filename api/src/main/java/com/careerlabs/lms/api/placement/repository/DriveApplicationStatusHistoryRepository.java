package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.DriveApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DriveApplicationStatusHistoryRepository extends JpaRepository<DriveApplicationStatusHistory, Long> {

    List<DriveApplicationStatusHistory> findByApplication_IdOrderByChangedAtDesc(Long applicationId);

    void deleteAllByApplication_Student_Id(Long studentId);

    void deleteAllByApplication_Drive_Id(Long driveId);

    /**
     * Re-attributes audit-trail rows (who changed a student's application status)
     * from a deleted admin to the admin performing the deletion. These are
     * workflow-history rows, not the deleted admin's personal data, so
     * reassigning (rather than blocking the delete) is safe.
     */
    @Modifying
    @Query("UPDATE DriveApplicationStatusHistory h SET h.changedBy = (SELECT u FROM User u WHERE u.id = :toUserId) WHERE h.changedBy.id = :fromUserId")
    void reassignChangedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}
