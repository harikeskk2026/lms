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

    /** Edit-history rows are workflow metadata, not the editor's personal data - reassign, don't delete. */
    @Modifying
    @Query("UPDATE AnnouncementVersion v SET v.changedBy = (SELECT u FROM User u WHERE u.id = :toUserId) WHERE v.changedBy.id = :fromUserId")
    void reassignChangedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}
