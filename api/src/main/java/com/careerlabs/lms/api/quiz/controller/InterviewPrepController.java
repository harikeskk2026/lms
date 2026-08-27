package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewPrepPageResponse;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.service.InterviewQuestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Student-facing browsing of the standalone interview Q&A bank (category/difficulty
 * filters, search, pagination) — separate from the scored {@code INTERVIEW_PREP} quiz
 * flow served under {@code /api/student/quizzes}.
 */
@RestController
@RequestMapping("/api/student/interview-prep")
public class InterviewPrepController {

    private final InterviewQuestionService interviewQuestionService;

    public InterviewPrepController(InterviewQuestionService interviewQuestionService) {
        this.interviewQuestionService = interviewQuestionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<InterviewPrepPageResponse>> browse(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) QuizDifficulty difficulty,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(
                interviewQuestionService.browse(category, difficulty, search, page, limit)));
    }
}
