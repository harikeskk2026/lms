package com.careerlabs.lms.api.assignment.dto.response;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record AssignmentResponse(
        Long id,
        String title,
        String description,
        CourseSummary course,
        BatchSummary batch,
        LocalDate startDate,
        LocalTime publishTime,
        LocalDate dueDate,
        LocalTime closeTime,
        int totalMarks,
        String attachmentUrl,
        String attachmentName,
        AssignmentStatus status,
        Instant createdAt,
        Instant updatedAt,
        int submissionCount,
        List<AssignmentAttachmentResponse> attachments
) {

    public AssignmentResponse(
            Long id,
            String title,
            String description,
            CourseSummary course,
            BatchSummary batch,
            LocalDate startDate,
            LocalTime publishTime,
            LocalDate dueDate,
            LocalTime closeTime,
            int totalMarks,
            String attachmentUrl,
            String attachmentName,
            AssignmentStatus status,
            Instant createdAt,
            Instant updatedAt,
            int submissionCount
    ) {
        this(id, title, description, course, batch, startDate, publishTime, dueDate, closeTime,
                totalMarks, attachmentUrl, attachmentName, status, createdAt, updatedAt, submissionCount,
                attachmentUrl != null ? List.of(new AssignmentAttachmentResponse(attachmentUrl, attachmentName)) : List.of());
    }

    public static AssignmentResponse from(Assignment assignment) {
        return from(assignment, 0);
    }

    public static AssignmentResponse from(Assignment assignment, int submissionCount) {
        List<AssignmentAttachmentResponse> attachments = assignment.getAttachments() != null && !assignment.getAttachments().isEmpty()
                ? assignment.getAttachments().stream().map(a -> new AssignmentAttachmentResponse(a.getFileUrl(), a.getFileName())).toList()
                : (assignment.getAttachmentUrl() != null ? List.of(new AssignmentAttachmentResponse(assignment.getAttachmentUrl(), assignment.getAttachmentName())) : List.of());

        return new AssignmentResponse(
                assignment.getId(),
                assignment.getTitle(),
                assignment.getDescription(),
                new CourseSummary(assignment.getCourse().getId(), assignment.getCourse().getTitle()),
                new BatchSummary(assignment.getBatch().getId(), assignment.getBatch().getName()),
                assignment.getStartDate(),
                assignment.getPublishTime(),
                assignment.getDueDate(),
                assignment.getCloseTime(),
                assignment.getTotalMarks(),
                assignment.getAttachmentUrl(),
                assignment.getAttachmentName(),
                assignment.getStatus(),
                assignment.getCreatedAt(),
                assignment.getUpdatedAt(),
                submissionCount,
                attachments);
    }

    public record CourseSummary(Long id, String title) {
    }

    public record BatchSummary(Long id, String name) {
    }
}
