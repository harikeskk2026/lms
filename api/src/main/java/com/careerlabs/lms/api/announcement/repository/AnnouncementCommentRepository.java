package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementCommentRepository extends JpaRepository<AnnouncementComment, Long> {

    List<AnnouncementComment> findByAnnouncementIdOrderByCreatedAtAsc(Long announcementId);
}
