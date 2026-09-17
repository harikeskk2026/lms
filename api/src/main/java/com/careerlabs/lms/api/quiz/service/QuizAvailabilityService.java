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
     * Whether a SUBMITTED attempt's score/answer-key should stay hidden per the
     * quiz's {@code resultVisibility} rule — re-evaluated on every read (never
     * stored), so a quiz that closes (AFTER_CLOSE) or gets an admin release
     * (MANUAL) reveals results without needing to touch any attempt row.
     */
    boolean isResultsPending(Quiz quiz);

    /**
     * True if the given student's batch (including batches from active enrollments),
     * course (including courses from active enrollments), or own user id matches at
     * least one assignment row for this quiz. Practice quizzes with no assignment
     * rows are visible only to the user who created them.
     */
    boolean isAssignedTo(Quiz quiz, Long studentUserId);
}
