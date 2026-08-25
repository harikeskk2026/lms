package com.careerlabs.lms.api.department.repository;

import com.careerlabs.lms.api.department.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findByCourseIdOrderByNameAsc(Long courseId);

    List<Department> findByCourseIdAndNameContainingIgnoreCaseOrderByNameAsc(Long courseId, String search);
}
