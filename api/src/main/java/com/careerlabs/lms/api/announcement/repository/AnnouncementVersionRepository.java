package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementVersionRepository extends JpaRepository<AnnouncementVersion, Long> {

    List<AnnouncementVersion> findByAnnouncementIdOrderByVersionNumberDesc(Long announcementId);

    int countByAnnouncementId(Long announcementId);
}
