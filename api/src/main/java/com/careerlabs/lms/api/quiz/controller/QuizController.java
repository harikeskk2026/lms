package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.AttachQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResponse;
import com.careerlabs.lms.api.quiz.service.QuizService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin quiz CRUD + question-bank attachment. Every response here (including the
 * nested questions) is the full admin view, answer keys included — never reused
 * for a student-facing response.
 */
@RestController
@RequestMapping("/api/admin/quizzes")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuizResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(quizService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(quizService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<QuizResponse>> create(@Valid @RequestBody CreateQuizRequest request,
                                                              @AuthenticationPrincipal JwtUserPrincipal principal) {
        QuizResponse response = quizService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Quiz created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizResponse>> update(@PathVariable Long id,
                                                              @Valid @RequestBody UpdateQuizRequest request) {
        QuizResponse response = quizService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Quiz updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        quizService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Quiz deleted", null));
    }

    @PostMapping("/{id}/questions")
    public ResponseEntity<ApiResponse<QuizResponse>> attachQuestions(@PathVariable Long id,
                                                                       @Valid @RequestBody AttachQuestionsRequest request) {
        QuizResponse response = quizService.attachQuestions(id, request);
        return ResponseEntity.ok(ApiResponse.of("Questions attached", response));
    }

    @DeleteMapping("/{id}/questions/{questionId}")
    public ResponseEntity<ApiResponse<QuizResponse>> detachQuestion(@PathVariable Long id,
                                                                      @PathVariable Long questionId) {
        QuizResponse response = quizService.detachQuestion(id, questionId);
        return ResponseEntity.ok(ApiResponse.of("Question detached", response));
    }

    @GetMapping("/{id}/analytics")
    public ResponseEntity<ApiResponse<AdminQuizAnalyticsResponse>> getAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(quizService.getAnalytics(id)));
    }
}
