package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.StudentGameStats;

public interface GamificationService {

    /**
     * Awards XP for a just-submitted attempt, updates the student's daily streak,
     * and unlocks any newly-earned achievements. Called once per submit, after the
     * attempt itself has been scored and saved.
     */
    void processSubmission(Long studentId, QuizAttempt attempt);

    StudentGameStats getOrCreateStats(Long studentId);
}
