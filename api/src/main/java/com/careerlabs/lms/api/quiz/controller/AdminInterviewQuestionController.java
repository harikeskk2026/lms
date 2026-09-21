package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewQuestionPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewQuestionResponse;
import com.careerlabs.lms.api.quiz.service.InterviewQuestionService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin management of the standalone interview Q&A bank shown on the student
 * Interview Prep tab (see {@link InterviewPrepController}).
 */
@RestController
@RequestMapping("/api/admin/interview-questions")
public class AdminInterviewQuestionController {

    private final InterviewQuestionService interviewQuestionService;

    public AdminInterviewQuestionController(InterviewQuestionService interviewQuestionService) {
        this.interviewQuestionService = interviewQuestionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<InterviewQuestionPageResponse>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Long courseId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(interviewQuestionService.pageAll(category, difficulty, search, active, courseId, page, limit)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InterviewQuestionResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(interviewQuestionService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InterviewQuestionResponse>> create(
            @Valid @RequestBody CreateInterviewQuestionRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        InterviewQuestionResponse response = interviewQuestionService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Interview question created", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<InterviewQuestionResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateInterviewQuestionRequest request) {
        InterviewQuestionResponse response = interviewQuestionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Interview question updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        interviewQuestionService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Interview question deleted", null));
    }
}
