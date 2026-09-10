package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.PreparationDocument;
import com.careerlabs.lms.api.placement.entity.PreparationMaterial;
import com.careerlabs.lms.api.placement.entity.PreparationQuestion;

import java.util.List;

public record PreparationMaterialDetailResponse(
    Long id,
    String title,
    String interviewType,
    String status,
    String instructions,
    PreparationMaterialResponse.CourseRef course,
    String publishedByName,
    String publishedAt,
    String archivedAt,
    List<DocumentResponse> documents,
    List<QuestionResponse> questions,
    String createdAt,
    String updatedAt
) {
    public record DocumentResponse(Long id, String fileName, String fileUrl, String contentType, long fileSize, String createdAt) {}

    public record QuestionResponse(Long id, String questionText, String answerText, Integer sortOrder) {}

    public static PreparationMaterialDetailResponse from(PreparationMaterial m) {
        PreparationMaterialResponse summary = PreparationMaterialResponse.from(m);
        List<DocumentResponse> docs = m.getDocuments().stream()
                .map(d -> new DocumentResponse(d.getId(), d.getFileName(), d.getFileUrl(),
                        d.getContentType(), d.getFileSize(),
                        d.getCreatedAt() != null ? d.getCreatedAt().toString() : null))
                .toList();
        List<QuestionResponse> questions = m.getQuestions().stream()
                .sorted((a, b) -> {
                    int aSort = a.getSortOrder() != null ? a.getSortOrder() : Integer.MAX_VALUE;
                    int bSort = b.getSortOrder() != null ? b.getSortOrder() : Integer.MAX_VALUE;
                    int bySort = Integer.compare(aSort, bSort);
                    if (bySort != 0) return bySort;
                    if (a.getId() == null) return -1;
                    if (b.getId() == null) return 1;
                    return Long.compare(a.getId(), b.getId());
                })
                .map(q -> new QuestionResponse(q.getId(), q.getQuestionText(), q.getAnswerText(), q.getSortOrder()))
                .toList();
        return new PreparationMaterialDetailResponse(
                summary.id(),
                summary.title(),
                summary.interviewType(),
                summary.status().name(),
                summary.instructions(),
                summary.course(),
                summary.publishedByName(),
                summary.publishedAt() != null ? summary.publishedAt().toString() : null,
                summary.archivedAt() != null ? summary.archivedAt().toString() : null,
                docs,
                questions,
                summary.createdAt() != null ? summary.createdAt().toString() : null,
                summary.updatedAt() != null ? summary.updatedAt().toString() : null
        );
    }
}