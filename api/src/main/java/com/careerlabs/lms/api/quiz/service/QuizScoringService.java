package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;

public interface QuizScoringService {

    /**
     * Evaluates a single answered question against its question's correct options
     * and sets {@code correct}/{@code pointsEarned} on the given attempt row.
     * A question with no selected options is scored as incorrect (skipped), never
     * throws, and never trusts anything the caller computed client-side.
     */
    void score(QuestionAttempt questionAttempt);

    /**
     * Same as {@link #score(QuestionAttempt)}, but when {@code negativeMarking} is
     * true a wrong (non-skipped) answer deducts the question's full effective
     * points instead of scoring zero. A skipped question is never penalized.
     */
    void score(QuestionAttempt questionAttempt, boolean negativeMarking);
}
