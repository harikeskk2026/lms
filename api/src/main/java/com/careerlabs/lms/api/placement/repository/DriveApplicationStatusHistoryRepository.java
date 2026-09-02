package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.DriveApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DriveApplicationStatusHistoryRepository extends JpaRepository<DriveApplicationStatusHistory, Long> {

    List<DriveApplicationStatusHistory> findByApplication_IdOrderByChangedAtDesc(Long applicationId);
}
