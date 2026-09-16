package com.careerlabs.lms.api.submission.repository;

import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.dto.response.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    List<AssignmentSubmission> findByAssignmentId(Long assignmentId);

    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);

    List<AssignmentSubmission> findByStudentId(Long studentId);

    List<AssignmentSubmission> findByStudentIdIn(List<Long> studentIds);

    List<AssignmentSubmission> findByAssignmentIdIn(List<Long> assignmentIds);

    List<AssignmentSubmission> findByAssignmentIdInAndStudentId(List<Long> assignmentIds, Long studentId);

    long countByReviewedFalse();

    long countByReviewedTrue();

    long countByLateTrue();

    /** Submissions awaiting admin/trainer action — PENDING_APPROVAL (not yet approved/graded). */
    @Query("SELECT COUNT(s) FROM AssignmentSubmission s WHERE s.status = :status OR (s.status IS NULL AND s.reviewed = false)")
    long countPendingApprovalWithStatus(@Param("status") SubmissionStatus status);

    /** Late submissions still awaiting approval. */
    @Query("SELECT COUNT(s) FROM AssignmentSubmission s WHERE s.late = true AND (s.status = :status OR (s.status IS NULL AND s.reviewed = false))")
    long countLateAndPendingApprovalWithStatus(@Param("status") SubmissionStatus status);

    default long countPendingApproval() {
        return countPendingApprovalWithStatus(SubmissionStatus.PENDING_APPROVAL);
    }

    default long countLateAndPendingApproval() {
        return countLateAndPendingApprovalWithStatus(SubmissionStatus.PENDING_APPROVAL);
    }

    List<AssignmentSubmission> findTop10ByOrderBySubmittedAtDesc();

    void deleteAllByStudentId(Long studentId);

    @Query("SELECT COUNT(s) FROM AssignmentSubmission s WHERE s.reviewed = false AND s.assignment.batch.id IN :batchIds")
    long countUnreviewedByBatchIds(@Param("batchIds") List<Long> batchIds);

    @Query("SELECT s FROM AssignmentSubmission s WHERE s.reviewed = false AND s.assignment.batch.id IN :batchIds ORDER BY s.submittedAt DESC")
    List<AssignmentSubmission> findUnreviewedByBatchIds(@Param("batchIds") List<Long> batchIds);
}
