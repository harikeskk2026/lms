package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.TopicPerformanceResponse;
import com.careerlabs.lms.api.quiz.dto.response.WeakAreaResponse;

import java.util.List;

public interface WeakAreaService {

    /** Per-topic accuracy across every SUBMITTED attempt the student has made. */
    List<TopicPerformanceResponse> getTopicPerformance(Long studentId);

    /** Topics where {@link TopicPerformanceResponse#level()} is WEAK (accuracy below 40%). */
    List<WeakAreaResponse> getWeakAreas(Long studentId);

    /**
     * Builds and publishes a short practice quiz drawn from the student's weak topics.
     * Throws if no weak areas have been detected yet (not enough attempt history, or
     * performance is already solid everywhere).
     */
    StudentQuizResponse createPracticeQuiz(Long studentId);
}
