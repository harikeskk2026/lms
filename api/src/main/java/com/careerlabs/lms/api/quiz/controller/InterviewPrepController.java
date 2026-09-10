package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.response.AptitudeTipResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewPrepPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourceResponse;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.service.AptitudeTipService;
import com.careerlabs.lms.api.quiz.service.InterviewQuestionService;
import com.careerlabs.lms.api.quiz.service.InterviewResourceService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Student-facing browsing of the standalone interview Q&A bank (category/difficulty
 * filters, search, pagination) — separate from the scored {@code INTERVIEW_PREP} quiz
 * flow served under {@code /api/student/quizzes}.
 */
@RestController
@RequestMapping("/api/student/interview-prep")
public class InterviewPrepController {

    private final InterviewQuestionService interviewQuestionService;
    private final AptitudeTipService aptitudeTipService;
    private final InterviewResourceService interviewResourceService;
    private final StudentRepository studentRepository;

    public InterviewPrepController(InterviewQuestionService interviewQuestionService,
                                   AptitudeTipService aptitudeTipService,
                                   InterviewResourceService interviewResourceService,
                                   StudentRepository studentRepository) {
        this.interviewQuestionService = interviewQuestionService;
        this.aptitudeTipService = aptitudeTipService;
        this.interviewResourceService = interviewResourceService;
        this.studentRepository = studentRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<InterviewPrepPageResponse>> browse(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) QuizDifficulty difficulty,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        Long courseId = studentRepository.findByUserId(principal.id())
                .map(s -> s.getCourse() != null ? s.getCourse().getId() : null)
                .orElse(null);
        return ResponseEntity.ok(ApiResponse.of(
                interviewQuestionService.browse(category, difficulty, search, courseId, page, limit)));
    }

    @GetMapping("/aptitude-tips")
    public ResponseEntity<ApiResponse<List<AptitudeTipResponse>>> aptitudeTips() {
        return ResponseEntity.ok(ApiResponse.of(aptitudeTipService.listActive()));
    }

    @GetMapping("/resources")
    public ResponseEntity<ApiResponse<List<InterviewResourceResponse>>> resources() {
        return ResponseEntity.ok(ApiResponse.of(interviewResourceService.listActive()));
    }
}
