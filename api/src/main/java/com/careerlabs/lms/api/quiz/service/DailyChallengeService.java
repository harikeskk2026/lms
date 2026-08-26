package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.DailyChallengeResponse;
import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;

public interface DailyChallengeService {

    /** Gets (auto-creating if needed) today's challenge and this student's status on it. */
    DailyChallengeResponse getToday(Long studentId);

    /** Starts (or resumes) this student's attempt at today's challenge. */
    StartAttemptResponse start(Long studentId);
}
