package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.PreparationQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreparationQuestionRepository extends JpaRepository<PreparationQuestion, Long> {
    void deleteByMaterial_Id(Long materialId);
}