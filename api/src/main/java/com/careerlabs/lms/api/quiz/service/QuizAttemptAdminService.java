package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResultResponse;

import java.util.List;

/**
 * Admin/superadmin read access to student quiz attempts — always sees full
 * results regardless of a quiz's {@code resultVisibility} setting, and is not
 * gated by attempt ownership (unlike {@link QuizAttemptService}, which is the
 * student self-service equivalent).
 */
public interface QuizAttemptAdminService {

    List<AdminQuizAttemptResponse> listAttempts(Long quizId);

    QuizResultResponse getAttemptReview(Long quizId, Long attemptId);
}
