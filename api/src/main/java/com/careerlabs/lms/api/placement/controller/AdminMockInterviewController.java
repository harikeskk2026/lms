package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.placement.dto.request.CreateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.MockCandidateFeedbackRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.MockInterviewResponse;
import com.careerlabs.lms.api.placement.entity.MockInterview;
import com.careerlabs.lms.api.placement.repository.MockInterviewRepository;
import com.careerlabs.lms.api.placement.service.MockInterviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/mock-interviews")
public class AdminMockInterviewController {

    private final MockInterviewService mockInterviewService;
    private final MockInterviewRepository mockInterviewRepository;

    public AdminMockInterviewController(MockInterviewService mockInterviewService, MockInterviewRepository mockInterviewRepository) {
        this.mockInterviewService = mockInterviewService;
        this.mockInterviewRepository = mockInterviewRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MockInterviewResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(mockInterviewService.listAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MockInterviewResponse>> get(@PathVariable Long id) {
        MockInterview mock = mockInterviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mock interview not found: " + id));
        return ResponseEntity.ok(ApiResponse.of(MockInterviewResponse.from(mock)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MockInterviewResponse>> create(@Valid @RequestBody CreateMockInterviewRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.of("Mock interview scheduled", mockInterviewService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<MockInterviewResponse>> update(@PathVariable Long id, @RequestBody UpdateMockInterviewRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Mock interview updated", mockInterviewService.update(id, request)));
    }

    @PatchMapping("/{id}/candidates/{candidateId}")
    public ResponseEntity<ApiResponse<MockInterviewResponse>> updateCandidate(@PathVariable Long id,
                                                                              @PathVariable Long candidateId,
                                                                              @RequestBody MockCandidateFeedbackRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Candidate updated", mockInterviewService.updateCandidate(id, candidateId, request)));
    }
}