package com.careerlabs.lms.api.college.repository;

import com.careerlabs.lms.api.college.entity.College;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollegeRepository extends JpaRepository<College, Long> {

    boolean existsByNameIgnoreCase(String name);

    java.util.Optional<College> findByNameIgnoreCase(String name);

    List<College> findByNameContainingIgnoreCaseOrderByNameAsc(String search);

    List<College> findAllByOrderByNameAsc();
}
