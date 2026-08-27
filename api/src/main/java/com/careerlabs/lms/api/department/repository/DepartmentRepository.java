package com.careerlabs.lms.api.department.repository;

import com.careerlabs.lms.api.department.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findByCollegeIdOrderByNameAsc(Long collegeId);

    List<Department> findByCollegeIdAndNameContainingIgnoreCaseOrderByNameAsc(Long collegeId, String search);
}
