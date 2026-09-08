package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuestionAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuestionResponse;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.service.QuestionService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin question-bank CRUD. Questions live independently of any single quiz so the
 * same bank question can be reused across multiple quizzes (see QuizController's
 * attach/detach endpoints).
 */
@RestController
@RequestMapping("/api/admin/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> search(
            @RequestParam(required = false) Long topicId,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) QuizDifficulty difficulty,
            @RequestParam(required = false) QuestionType questionType,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String search) {
        List<QuestionResponse> results = questionService.search(topicId, courseId, difficulty, questionType, active, search);
        return ResponseEntity.ok(ApiResponse.of(results));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(questionService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<QuestionResponse>> create(@Valid @RequestBody CreateQuestionRequest request,
                                                                  @AuthenticationPrincipal JwtUserPrincipal principal) {
        QuestionResponse response = questionService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Question created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestionResponse>> update(@PathVariable Long id,
                                                                  @Valid @RequestBody UpdateQuestionRequest request) {
        QuestionResponse response = questionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Question updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        questionService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.of("Question deactivated", null));
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        questionService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Question deleted", null));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ApiResponse<QuestionResponse>> duplicate(@PathVariable Long id) {
        QuestionResponse response = questionService.duplicate(id);
        return ResponseEntity.status(201).body(ApiResponse.of("Question duplicated", response));
    }

    @GetMapping("/{id}/analytics")
    public ResponseEntity<ApiResponse<AdminQuestionAnalyticsResponse>> getAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(questionService.getAnalytics(id)));
    }
}
