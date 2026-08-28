package com.careerlabs.lms.api.assignment.repository;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long>, JpaSpecificationExecutor<Assignment> {

    List<Assignment> findByBatchId(Long batchId);

    List<Assignment> findByCourseId(Long courseId);

    List<Assignment> findByBatchIdAndStatusInOrderByDueDateAsc(Long batchId, List<AssignmentStatus> statuses);

    long countByStatus(AssignmentStatus status);
}
