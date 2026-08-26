package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.QuizAnalyticsResponse;

public interface QuizAnalyticsService {

    QuizAnalyticsResponse getAnalytics(Long studentId);
}
