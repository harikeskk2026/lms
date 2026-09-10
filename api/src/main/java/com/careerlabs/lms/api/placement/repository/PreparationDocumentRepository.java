package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.PreparationDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreparationDocumentRepository extends JpaRepository<PreparationDocument, Long> {
    void deleteByMaterial_Id(Long materialId);
}