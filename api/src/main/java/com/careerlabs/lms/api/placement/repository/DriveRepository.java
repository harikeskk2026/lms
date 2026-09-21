package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.Drive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface DriveRepository
        extends JpaRepository<Drive, Long>, JpaSpecificationExecutor<Drive> {

    List<Drive> findAllByOrderByDriveDateAsc();

    long countByCreatedBy(Long createdBy);
}
