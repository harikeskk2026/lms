package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.SkillAssessmentResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.WeakAreaResponse;
import com.careerlabs.lms.api.quiz.service.QuizAnalyticsService;
import com.careerlabs.lms.api.quiz.service.SkillAssessmentService;
import com.careerlabs.lms.api.quiz.service.WeakAreaService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student")
public class QuizAnalyticsController {

    private final QuizAnalyticsService quizAnalyticsService;
    private final WeakAreaService weakAreaService;
    private final SkillAssessmentService skillAssessmentService;

    public QuizAnalyticsController(QuizAnalyticsService quizAnalyticsService, WeakAreaService weakAreaService,
                                    SkillAssessmentService skillAssessmentService) {
        this.quizAnalyticsService = quizAnalyticsService;
        this.weakAreaService = weakAreaService;
        this.skillAssessmentService = skillAssessmentService;
    }

    @GetMapping("/quiz-analytics")
    public ResponseEntity<ApiResponse<QuizAnalyticsResponse>> getAnalytics(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(quizAnalyticsService.getAnalytics(principal.id())));
    }

    @GetMapping("/weak-areas")
    public ResponseEntity<ApiResponse<List<WeakAreaResponse>>> getWeakAreas(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(weakAreaService.getWeakAreas(principal.id())));
    }

    @PostMapping("/weak-areas/practice")
    public ResponseEntity<ApiResponse<StudentQuizResponse>> createPracticeQuiz(@AuthenticationPrincipal JwtUserPrincipal principal) {
        StudentQuizResponse response = weakAreaService.createPracticeQuiz(principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Practice quiz created", response));
    }

    @GetMapping("/skill-assessment")
    public ResponseEntity<ApiResponse<SkillAssessmentResponse>> getSkillAssessment(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(skillAssessmentService.getAssessment(principal.id())));
    }
}
