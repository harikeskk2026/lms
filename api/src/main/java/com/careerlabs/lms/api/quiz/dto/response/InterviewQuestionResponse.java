package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;

import java.time.Instant;
import java.util.List;

public record InterviewQuestionResponse(
        Long id,
        String category,
        String question,
        String answer,
        QuizDifficulty difficulty,
        List<String> tags,
        boolean active,
        Long courseId,
        String courseName,
        Instant createdAt,
        Instant updatedAt
) {

    public static InterviewQuestionResponse from(InterviewQuestion q) {
        return new InterviewQuestionResponse(
                q.getId(), q.getCategory(), q.getQuestionText(), q.getAnswerText(), q.getDifficulty(),
                q.getTagList(), q.isActive(),
                q.getCourse() != null ? q.getCourse().getId() : null,
                q.getCourse() != null ? q.getCourse().getTitle() : null,
                q.getCreatedAt(), q.getUpdatedAt());
    }
}
