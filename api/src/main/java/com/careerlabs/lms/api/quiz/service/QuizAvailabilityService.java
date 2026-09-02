package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizEffectiveStatus;

/**
 * Shared by {@code QuizService} (for read responses) and {@code QuizAttemptService}
 * (to actually gate starting an attempt) so scheduling/assignment rules are defined
 * exactly once.
 */
public interface QuizAvailabilityService {

    QuizEffectiveStatus effectiveStatus(Quiz quiz);

    /**
     * True if the quiz has no assignment rows at all (visible to everyone — today's
     * behavior for every pre-existing quiz), or the given student's batch, course,
     * or own user id matches at least one assignment row for this quiz.
     */
    boolean isAssignedTo(Quiz quiz, Long studentUserId);
}
