package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.Drive;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DriveRepository extends JpaRepository<Drive, Long> {

    List<Drive> findAllByOrderByDriveDateAsc();
}
