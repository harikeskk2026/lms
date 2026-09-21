package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.AptitudeTip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AptitudeTipRepository
        extends JpaRepository<AptitudeTip, Long>, JpaSpecificationExecutor<AptitudeTip> {

    List<AptitudeTip> findByActiveTrueOrderByIdAsc();

    long countByActiveTrue();

    /** Shared platform content - reassign attribution rather than delete it when its author is removed. */
    @Modifying
    @Query("UPDATE AptitudeTip t SET t.createdBy = :toUserId WHERE t.createdBy = :fromUserId")
    void reassignCreatedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}