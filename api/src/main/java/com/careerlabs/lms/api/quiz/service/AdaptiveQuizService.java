package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuestionResponse;

/**
 * Drives quizzes configured as {@code QuizType.ADAPTIVE}: one question is served at a
 * time, and the next one's difficulty is chosen from how the student did on the last
 * one — never all-at-once like a standard quiz. Kept fully separate from
 * {@link QuizAttemptService} so normal quizzes are untouched by this.
 */
public interface AdaptiveQuizService {

    /** Starts (or resumes) an adaptive attempt, returning just the first/current question. */
    StartAttemptResponse start(Long quizId, Long studentId);

    /**
     * Scores the most recently served question, then selects and persists the next one
     * based on that result. Returns {@code null} once the adaptive session is complete
     * (the caller should submit at that point).
     */
    StudentQuestionResponse next(Long attemptId, Long studentId);
}
