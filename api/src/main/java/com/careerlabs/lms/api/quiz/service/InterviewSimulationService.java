package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.InterviewSimulationResponse;

public interface InterviewSimulationService {

    /** Only meaningful for a SUBMITTED attempt on a quiz configured as INTERVIEW_PREP. */
    InterviewSimulationResponse getResult(Long attemptId, Long studentId);
}
