package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.CompleteInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateEvaluationRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateInterviewRoundRequest;
import com.careerlabs.lms.api.placement.dto.request.ScheduleInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.InterviewEvaluationResponse;
import com.careerlabs.lms.api.placement.dto.response.InterviewRoundResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewPageResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewResponse;
import com.careerlabs.lms.api.placement.service.PlacementInterviewService;
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

import java.util.List;

/**
 * Admin interview-process management for a drive: configure interview rounds,
 * schedule candidate interviews, complete them with a result, and record
 * structured evaluations.
 */
@RestController
@RequestMapping("/api/admin/drives/{driveId}/interviews")
public class AdminPlacementInterviewController {

    private final PlacementInterviewService interviewService;

    public AdminPlacementInterviewController(PlacementInterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @GetMapping("/rounds")
    public ResponseEntity<ApiResponse<List<InterviewRoundResponse>>> listRounds(@PathVariable Long driveId) {
        return ResponseEntity.ok(ApiResponse.of(interviewService.listRounds(driveId)));
    }

    @PostMapping("/rounds")
    public ResponseEntity<ApiResponse<InterviewRoundResponse>> createRound(
            @PathVariable Long driveId,
            @Valid @RequestBody CreateInterviewRoundRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Interview round created", interviewService.createRound(driveId, request, principal.id())));
    }

    @DeleteMapping("/rounds/{roundId}")
    public ResponseEntity<ApiResponse<Void>> deleteRound(@PathVariable Long driveId, @PathVariable Long roundId,
                                                         @AuthenticationPrincipal JwtUserPrincipal principal) {
        interviewService.deleteRound(driveId, roundId, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Interview round deleted", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PlacementInterviewPageResponse>> list(
            @PathVariable Long driveId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(interviewService.pageForDrive(driveId, search, status, page, limit)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlacementInterviewResponse>> schedule(
            @PathVariable Long driveId,
            @Valid @RequestBody ScheduleInterviewRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Interview scheduled", interviewService.schedule(driveId, request, principal.id())));
    }

    @PatchMapping("/{interviewId}")
    public ResponseEntity<ApiResponse<PlacementInterviewResponse>> complete(
            @PathVariable Long driveId, @PathVariable Long interviewId,
            @Valid @RequestBody CompleteInterviewRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        PlacementInterviewResponse response = interviewService.complete(driveId, interviewId, request, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Interview updated", response));
    }

    @PostMapping("/evaluations")
    public ResponseEntity<ApiResponse<InterviewEvaluationResponse>> evaluate(
            @PathVariable Long driveId,
            @Valid @RequestBody CreateEvaluationRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Evaluation submitted", interviewService.evaluate(driveId, request, principal.id())));
    }

    @GetMapping("/{interviewId}/evaluations")
    public ResponseEntity<ApiResponse<List<InterviewEvaluationResponse>>> evaluations(
            @PathVariable Long driveId, @PathVariable Long interviewId) {
        return ResponseEntity.ok(ApiResponse.of(interviewService.listEvaluations(driveId, interviewId)));
    }
}