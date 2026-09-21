package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourcePageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourceResponse;
import com.careerlabs.lms.api.quiz.service.InterviewResourceService;
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
 * Admin management of interview-prep resources shown on the student Interview Prep tab.
 */
@RestController
@RequestMapping("/api/admin/interview-resources")
public class AdminInterviewResourceController {

    private final InterviewResourceService interviewResourceService;

    public AdminInterviewResourceController(InterviewResourceService interviewResourceService) {
        this.interviewResourceService = interviewResourceService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<InterviewResourcePageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(interviewResourceService.page(search, tag, active, page, limit)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InterviewResourceResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(interviewResourceService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InterviewResourceResponse>> create(
            @Valid @RequestBody CreateInterviewResourceRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        InterviewResourceResponse response = interviewResourceService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Interview resource created", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<InterviewResourceResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateInterviewResourceRequest request) {
        InterviewResourceResponse response = interviewResourceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Interview resource updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        interviewResourceService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Interview resource deleted", null));
    }
}