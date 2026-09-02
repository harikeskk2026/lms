package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.service.AdaptiveQuizService;
import com.careerlabs.lms.api.quiz.service.QuizAttemptService;
import com.careerlabs.lms.api.quiz.service.QuizService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Student-facing quiz browsing + attempt start. Every response here is the safe,
 * answer-key-free view (see {@link StudentQuizResponse}/{@link StartAttemptResponse}).
 */
@RestController
@RequestMapping("/api/student/quizzes")
public class StudentQuizController {

    private final QuizService quizService;
    private final QuizAttemptService quizAttemptService;
    private final AdaptiveQuizService adaptiveQuizService;

    public StudentQuizController(QuizService quizService, QuizAttemptService quizAttemptService,
                                  AdaptiveQuizService adaptiveQuizService) {
        this.quizService = quizService;
        this.quizAttemptService = quizAttemptService;
        this.adaptiveQuizService = adaptiveQuizService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentQuizResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(quizService.listPublished(principal.id())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentQuizResponse>> get(@PathVariable Long id,
                                                                  @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(quizService.getPublished(id, principal.id())));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<StartAttemptResponse>> start(@PathVariable Long id,
                                                                     @AuthenticationPrincipal JwtUserPrincipal principal) {
        StartAttemptResponse response = quizAttemptService.start(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/{id}/adaptive/start")
    public ResponseEntity<ApiResponse<StartAttemptResponse>> startAdaptive(@PathVariable Long id,
                                                                             @AuthenticationPrincipal JwtUserPrincipal principal) {
        StartAttemptResponse response = adaptiveQuizService.start(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(response));
    }
}
