package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementAcknowledgment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AnnouncementAcknowledgmentRepository extends JpaRepository<AnnouncementAcknowledgment, Long> {

    boolean existsByAnnouncementIdAndStudentId(Long announcementId, Long studentId);

    Optional<AnnouncementAcknowledgment> findByAnnouncementIdAndStudentId(Long announcementId, Long studentId);

    long countByAnnouncementId(Long announcementId);

    void deleteAllByStudentId(Long studentId);

    @Modifying
    @Query("DELETE FROM AnnouncementAcknowledgment a WHERE a.announcement.id = :announcementId")
    void deleteAllByAnnouncementId(@Param("announcementId") Long announcementId);
}
