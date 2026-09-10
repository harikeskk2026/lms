package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.MockInterviewCandidate;
import com.careerlabs.lms.api.placement.entity.MockInterviewCandidateStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MockInterviewCandidateRepository extends JpaRepository<MockInterviewCandidate, Long> {

    List<MockInterviewCandidate> findByStudent_IdOrderByMockInterviewScheduledAtDesc(Long studentId);

    long countByStudent_Id(Long studentId);

    long countByStudent_IdAndStatus(Long studentId, MockInterviewCandidateStatus status);

    long countByStudent_IdAndStatusIn(Long studentId, List<MockInterviewCandidateStatus> statuses);

    List<MockInterviewCandidate> findByMockInterview_Id(Long mockInterviewId);

    boolean existsByMockInterview_IdAndStudent_Id(Long mockInterviewId, Long studentId);
}