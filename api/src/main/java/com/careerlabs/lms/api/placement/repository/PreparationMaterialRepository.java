package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.PreparationMaterial;
import com.careerlabs.lms.api.placement.entity.PreparationMaterialStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PreparationMaterialRepository extends JpaRepository<PreparationMaterial, Long> {

    List<PreparationMaterial> findAllByOrderByCreatedAtDesc();

    List<PreparationMaterial> findByStatusOrderByCreatedAtDesc(PreparationMaterialStatus status);

    List<PreparationMaterial> findByStatusAndCourseIdOrderByCreatedAtDesc(PreparationMaterialStatus status, Long courseId);

    List<PreparationMaterial> findByStatusAndCourseIsNullOrderByCreatedAtDesc(PreparationMaterialStatus status);

    /** Shared platform content - reassign attribution rather than delete it when its publisher is removed. */
    @Modifying
    @Query("UPDATE PreparationMaterial m SET m.publishedBy = (SELECT u FROM User u WHERE u.id = :toUserId) WHERE m.publishedBy.id = :fromUserId")
    void reassignPublishedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}