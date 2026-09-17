package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AnnouncementTemplateRepository extends JpaRepository<AnnouncementTemplate, Long> {

    List<AnnouncementTemplate> findAllByOrderByNameAsc();

    /** Shared, reusable boilerplate - reassign attribution rather than delete it when its author is removed. */
    @Modifying
    @Query("UPDATE AnnouncementTemplate t SET t.createdBy = (SELECT u FROM User u WHERE u.id = :toUserId) WHERE t.createdBy.id = :fromUserId")
    void reassignCreatedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}
