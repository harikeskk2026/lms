package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.PreparationMaterial;
import com.careerlabs.lms.api.placement.entity.PreparationMaterialStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreparationMaterialRepository extends JpaRepository<PreparationMaterial, Long> {

    List<PreparationMaterial> findAllByOrderByCreatedAtDesc();

    List<PreparationMaterial> findByStatusOrderByCreatedAtDesc(PreparationMaterialStatus status);

    List<PreparationMaterial> findByStatusAndCourseIdOrderByCreatedAtDesc(PreparationMaterialStatus status, Long courseId);

    List<PreparationMaterial> findByStatusAndCourseIsNullOrderByCreatedAtDesc(PreparationMaterialStatus status);
}