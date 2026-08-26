package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.quiz.dto.response.QuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.TopicPerformanceResponse;
import com.careerlabs.lms.api.quiz.dto.response.WeakAreaResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.service.GamificationService;
import com.careerlabs.lms.api.quiz.service.QuizAnalyticsService;
import com.careerlabs.lms.api.quiz.service.WeakAreaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class QuizAnalyticsServiceImpl implements QuizAnalyticsService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final WeakAreaService weakAreaService;
    private final GamificationService gamificationService;

    public QuizAnalyticsServiceImpl(QuizAttemptRepository quizAttemptRepository, WeakAreaService weakAreaService,
                                     GamificationService gamificationService) {
        this.quizAttemptRepository = quizAttemptRepository;
        this.weakAreaService = weakAreaService;
        this.gamificationService = gamificationService;
    }

    @Override
    @Transactional
    public QuizAnalyticsResponse getAnalytics(Long studentId) {
        List<QuizAttempt> submitted = quizAttemptRepository.findByStudentIdOrderByStartedAtDesc(studentId).stream()
                .filter(attempt -> attempt.getStatus() == AttemptStatus.SUBMITTED)
                .toList();

        double overallSkill = submitted.stream().mapToDouble(this::scorePercentage).average().orElse(0);
        double accuracy = submitted.stream().mapToDouble(attempt -> attempt.getAccuracy() == null ? 0 : attempt.getAccuracy())
                .average().orElse(0);

        List<TopicPerformanceResponse> topicPerformance = weakAreaService.getTopicPerformance(studentId);
        List<TopicPerformanceResponse> strengths = topicPerformance.stream()
                .filter(topic -> "STRONG".equals(topic.level()))
                .toList();
        List<WeakAreaResponse> weakAreas = weakAreaService.getWeakAreas(studentId);

        List<QuizAttemptResponse> recentAttempts = submitted.stream().limit(10).map(QuizAttemptResponse::from).toList();

        StudentGameStats stats = gamificationService.getOrCreateStats(studentId);

        return new QuizAnalyticsResponse(
                round1(overallSkill),
                round1(accuracy),
                submitted.size(),
                stats.getCurrentStreak(),
                stats.getLongestStreak(),
                stats.getTotalXp(),
                topicPerformance,
                strengths,
                weakAreas,
                recentAttempts,
                buildImprovementHistory(submitted));
    }

    private double scorePercentage(QuizAttempt attempt) {
        if (attempt.getTotalScore() == null || attempt.getTotalScore() == 0 || attempt.getScore() == null) {
            return 0;
        }
        return (attempt.getScore() * 100.0) / attempt.getTotalScore();
    }

    private List<QuizAnalyticsResponse.ImprovementItem> buildImprovementHistory(List<QuizAttempt> submitted) {
        Map<Long, List<QuizAttempt>> byQuiz = submitted.stream()
                .collect(Collectors.groupingBy(attempt -> attempt.getQuiz().getId()));

        List<QuizAnalyticsResponse.ImprovementItem> items = new ArrayList<>();
        for (List<QuizAttempt> attempts : byQuiz.values()) {
            if (attempts.size() < 2) {
                continue;
            }
            List<QuizAttempt> ordered = attempts.stream()
                    .sorted(Comparator.comparingInt(QuizAttempt::getAttemptNumber))
                    .toList();
            QuizAttempt first = ordered.get(0);
            QuizAttempt latest = ordered.get(ordered.size() - 1);
            double firstPct = scorePercentage(first);
            double latestPct = scorePercentage(latest);

            items.add(new QuizAnalyticsResponse.ImprovementItem(
                    latest.getQuiz().getId(), latest.getQuiz().getTitle(),
                    round1(firstPct), round1(latestPct), round1(latestPct - firstPct), ordered.size()));
        }
        return items;
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
