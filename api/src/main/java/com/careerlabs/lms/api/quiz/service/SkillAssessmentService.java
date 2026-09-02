package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.SkillAssessmentResponse;

public interface SkillAssessmentService {

    SkillAssessmentResponse getAssessment(Long studentId);
}
