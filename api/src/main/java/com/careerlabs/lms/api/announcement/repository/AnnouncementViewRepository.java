package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementViewRepository extends JpaRepository<AnnouncementView, Long> {

    boolean existsByAnnouncementIdAndStudentId(Long announcementId, Long studentId);

    long countByAnnouncementId(Long announcementId);

    void deleteAllByStudentId(Long studentId);
}
