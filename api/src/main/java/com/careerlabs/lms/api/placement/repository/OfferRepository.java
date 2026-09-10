package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.Offer;
import com.careerlabs.lms.api.placement.entity.OfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OfferRepository extends JpaRepository<Offer, Long> {

    List<Offer> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
    List<Offer> findByDrive_IdOrderByCreatedAtDesc(Long driveId);
    List<Offer> findByApplication_Id(Long applicationId);
    boolean existsByApplication_IdAndStatus(Long applicationId, OfferStatus status);
    long countByStatus(OfferStatus status);
}