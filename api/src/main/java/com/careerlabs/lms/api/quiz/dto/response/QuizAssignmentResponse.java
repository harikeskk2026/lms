package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.AssignmentTargetType;
import com.careerlabs.lms.api.quiz.entity.QuizAssignment;

import java.time.Instant;
import java.time.LocalDateTime;

public record QuizAssignmentResponse(
        Long id,
        AssignmentTargetType targetType,
        Long targetId,
        String targetLabel,
        LocalDateTime availableFrom,
        LocalDateTime availableUntil,
        Instant assignedAt
) {

    public static QuizAssignmentResponse from(QuizAssignment assignment, String targetLabel) {
        return new QuizAssignmentResponse(
                assignment.getId(),
                assignment.getTargetType(),
                assignment.getTargetId(),
                targetLabel,
                assignment.getAvailableFrom(),
                assignment.getAvailableUntil(),
                assignment.getAssignedAt());
    }
}
