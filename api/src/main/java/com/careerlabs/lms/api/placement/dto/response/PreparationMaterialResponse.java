package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.PreparationMaterial;
import com.careerlabs.lms.api.placement.entity.PreparationMaterialStatus;
import org.hibernate.Hibernate;

import java.time.Instant;

public record PreparationMaterialResponse(
    Long id,
    String title,
    String interviewType,
    PreparationMaterialStatus status,
    String instructions,
    CourseRef course,
    String publishedByName,
    Instant publishedAt,
    Instant archivedAt,
    long documentCount,
    long questionsCount,
    Instant createdAt,
    Instant updatedAt
) {
    public record CourseRef(Long id, String title) {}

    public static PreparationMaterialResponse from(PreparationMaterial m) {
        CourseRef courseRef = null;
        if (m.getCourse() != null) {
            courseRef = new CourseRef(m.getCourse().getId(), m.getCourse().getTitle());
        }
        String publishedByName = null;
        if (m.getPublishedBy() != null) {
            try {
                if (Hibernate.isInitialized(m.getPublishedBy())) {
                    publishedByName = m.getPublishedBy().getName();
                }
            } catch (Exception e) {
                publishedByName = null;
            }
        }
        long docCount = m.getDocuments().stream().filter(d -> d.getId() != null).count();
        long qCount = m.getQuestions().stream().filter(q -> q.getId() != null).count();
        return new PreparationMaterialResponse(
                m.getId(),
                m.getTitle(),
                m.getInterviewType(),
                m.getStatus(),
                m.getInstructions(),
                courseRef,
                publishedByName,
                m.getPublishedAt(),
                m.getArchivedAt(),
                docCount,
                qCount,
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}