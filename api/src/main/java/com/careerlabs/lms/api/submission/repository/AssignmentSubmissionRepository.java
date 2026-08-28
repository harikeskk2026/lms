package com.careerlabs.lms.api.submission.repository;

import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    List<AssignmentSubmission> findByAssignmentId(Long assignmentId);

    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);

    List<AssignmentSubmission> findByStudentId(Long studentId);

    List<AssignmentSubmission> findByStudentIdIn(List<Long> studentIds);

    List<AssignmentSubmission> findByAssignmentIdIn(List<Long> assignmentIds);

    long countByReviewedFalse();

    long countByReviewedTrue();

    long countByLateTrue();

    List<AssignmentSubmission> findTop10ByOrderBySubmittedAtDesc();
}
