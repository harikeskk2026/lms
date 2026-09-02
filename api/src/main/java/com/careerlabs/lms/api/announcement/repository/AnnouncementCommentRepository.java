package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AnnouncementCommentRepository extends JpaRepository<AnnouncementComment, Long> {

    List<AnnouncementComment> findByAnnouncementIdOrderByCreatedAtAsc(Long announcementId);

    List<AnnouncementComment> findByUser_Id(Long userId);

    /**
     * Detaches any replies pointing at the given comments (sets parentComment to
     * null) instead of leaving a dangling FK - used before deleting a user's own
     * comments so a reply authored by someone else never gets silently destroyed
     * or blocked by a constraint violation. See StudentServiceImpl.delete().
     */
    @Modifying
    @Query("UPDATE AnnouncementComment c SET c.parentComment = NULL WHERE c.parentComment.id IN :commentIds")
    void clearParentCommentIn(@Param("commentIds") List<Long> commentIds);

    void deleteAllByUser_Id(Long userId);
}
