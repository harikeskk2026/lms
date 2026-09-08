package com.careerlabs.lms.api.assignment.dto.response;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

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
        Instant updatedAt
) {

    public static AssignmentResponse from(Assignment assignment) {
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
                assignment.getUpdatedAt());
    }

    public record CourseSummary(Long id, String title) {
    }

    public record BatchSummary(Long id, String name) {
    }
}
