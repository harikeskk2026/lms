package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.Offer;
import com.careerlabs.lms.api.placement.entity.OfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface OfferRepository
        extends JpaRepository<Offer, Long>, JpaSpecificationExecutor<Offer> {

    List<Offer> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
    List<Offer> findByDrive_IdOrderByCreatedAtDesc(Long driveId);
    List<Offer> findByApplication_Id(Long applicationId);
    boolean existsByApplication_IdAndStatus(Long applicationId, OfferStatus status);
    long countByStatus(OfferStatus status);
}