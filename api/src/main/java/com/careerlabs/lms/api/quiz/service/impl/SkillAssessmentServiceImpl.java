package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.quiz.dto.response.SkillAssessmentResponse;
import com.careerlabs.lms.api.quiz.dto.response.TopicPerformanceResponse;
import com.careerlabs.lms.api.quiz.service.SkillAssessmentService;
import com.careerlabs.lms.api.quiz.service.WeakAreaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SkillAssessmentServiceImpl implements SkillAssessmentService {

    private final WeakAreaService weakAreaService;

    public SkillAssessmentServiceImpl(WeakAreaService weakAreaService) {
        this.weakAreaService = weakAreaService;
    }

    @Override
    @Transactional(readOnly = true)
    public SkillAssessmentResponse getAssessment(Long studentId) {
        List<TopicPerformanceResponse> topics = weakAreaService.getTopicPerformance(studentId);

        double overallSkill = topics.isEmpty() ? 0 : topics.stream()
                .mapToDouble(TopicPerformanceResponse::accuracy)
                .average().orElse(0);

        List<String> strongTopics = topics.stream()
                .filter(t -> t.accuracy() >= 70)
                .map(TopicPerformanceResponse::topicName)
                .toList();
        List<String> weakTopics = topics.stream()
                .filter(t -> t.accuracy() < 40)
                .map(TopicPerformanceResponse::topicName)
                .toList();

        double rounded = Math.round(overallSkill * 10) / 10.0;
        return new SkillAssessmentResponse(rounded, SkillAssessmentResponse.levelFor(rounded),
                strongTopics, weakTopics, topics);
    }
}
