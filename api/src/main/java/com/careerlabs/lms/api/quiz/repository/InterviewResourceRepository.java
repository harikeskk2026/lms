package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.InterviewResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InterviewResourceRepository
        extends JpaRepository<InterviewResource, Long>, JpaSpecificationExecutor<InterviewResource> {

    List<InterviewResource> findByActiveTrueOrderByIdAsc();

    long countByActiveTrue();

    /** Shared platform content - reassign attribution rather than delete it when its author is removed. */
    @Modifying
    @Query("UPDATE InterviewResource r SET r.createdBy = :toUserId WHERE r.createdBy = :fromUserId")
    void reassignCreatedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}