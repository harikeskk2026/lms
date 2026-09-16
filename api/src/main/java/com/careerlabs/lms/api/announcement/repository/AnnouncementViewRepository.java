package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementViewRepository extends JpaRepository<AnnouncementView, Long> {

    boolean existsByAnnouncementIdAndStudentId(Long announcementId, Long studentId);

    @Query("SELECT v.announcement.id FROM AnnouncementView v WHERE v.student.id = :studentId")
    java.util.List<Long> findAnnouncementIdsByStudentId(@Param("studentId") Long studentId);

    long countByAnnouncementId(Long announcementId);

    void deleteAllByStudentId(Long studentId);

    @Modifying
    @Query("DELETE FROM AnnouncementView v WHERE v.announcement.id = :announcementId")
    void deleteAllByAnnouncementId(@Param("announcementId") Long announcementId);
}
