package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.MockInterview;
import com.careerlabs.lms.api.placement.entity.MockInterviewMode;
import com.careerlabs.lms.api.placement.entity.MockInterviewStatus;
import com.careerlabs.lms.api.placement.entity.PreparationMaterial;
import org.hibernate.Hibernate;

import java.time.Instant;
import java.util.List;

public record MockInterviewResponse(
    Long id,
    MockInterviewMode mode,
    Instant scheduledAt,
    Integer durationMinutes,
    String interviewerName,
    String meetLink,
    String location,
    MockInterviewStatus status,
    String syllabus,
    String instructions,
    List<MockInterviewCandidateResponse> candidates,
    List<Long> preparationMaterialIds,
    Instant createdAt
) {
    public record UserRef(Long id, String name, String email) {}

    public static MockInterviewResponse from(MockInterview m) {
        return build(m, m.getId(), null);
    }

    /**
     * Builds the response so the candidate list only exposes the current student's
     * participation (student view must never leak other students' data).
     */
    public static MockInterviewResponse forStudent(MockInterview m, Long studentId) {
        return build(m, m.getId(), studentId);
    }

    public static MockInterviewResponse from(MockInterview m, Long candidateOnlyStudentId) {
        return build(m, m.getId(), candidateOnlyStudentId);
    }

    private static MockInterviewResponse build(MockInterview m, Long id, Long candidateOnlyStudentId) {
        List<MockInterviewCandidateResponse> candidates;
        if (candidateOnlyStudentId != null) {
            candidates = m.getCandidates().stream()
                    .filter(c -> c.getStudent() != null && c.getStudent().getId().equals(candidateOnlyStudentId))
                    .map(MockInterviewCandidateResponse::from)
                    .toList();
        } else {
            candidates = m.getCandidates().stream().map(MockInterviewCandidateResponse::from).toList();
        }

        List<Long> prepIds = m.getPreparationMaterials().stream()
                .filter(pm -> pm.getId() != null)
                .map(PreparationMaterial::getId)
                .sorted()
                .toList();

        return new MockInterviewResponse(
                id,
                m.getMode(),
                m.getScheduledAt(),
                m.getDurationMinutes(),
                m.getInterviewerName(),
                m.getMeetLink(),
                m.getLocation(),
                m.getStatus(),
                m.getSyllabus(),
                m.getInstructions(),
                candidates,
                prepIds,
                m.getCreatedAt()
        );
    }
}