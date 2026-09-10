package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AnnouncementVersionRepository extends JpaRepository<AnnouncementVersion, Long> {

    List<AnnouncementVersion> findByAnnouncementIdOrderByVersionNumberDesc(Long announcementId);

    int countByAnnouncementId(Long announcementId);

    @Modifying
    @Query("DELETE FROM AnnouncementVersion v WHERE v.announcement.id = :announcementId")
    void deleteAllByAnnouncementId(@Param("announcementId") Long announcementId);
}
