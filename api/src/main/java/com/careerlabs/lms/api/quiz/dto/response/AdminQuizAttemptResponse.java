package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.QuizAttempt;

import java.time.Instant;

/**
 * One row in the admin "Results" list for a quiz — a submitted attempt
 * augmented with the student's display name (resolved separately, since
 * {@link QuizAttempt#getStudentId()} is a plain {@code User.id}, not a
 * relation). See {@code QuizAttemptAdminServiceImpl.listAttempts}.
 */
public record AdminQuizAttemptResponse(
        Long attemptId,
        Long studentId,
        String studentName,
        int attemptNumber,
        Integer score,
        Integer totalScore,
        Boolean passed,
        Integer timeTaken,
        Instant completedAt
) {

    public static AdminQuizAttemptResponse from(QuizAttempt attempt, String studentName) {
        return new AdminQuizAttemptResponse(
                attempt.getId(),
                attempt.getStudentId(),
                studentName,
                attempt.getAttemptNumber(),
                attempt.getScore(),
                attempt.getTotalScore(),
                attempt.getPassed(),
                attempt.getTimeTaken(),
                attempt.getCompletedAt());
    }
}
