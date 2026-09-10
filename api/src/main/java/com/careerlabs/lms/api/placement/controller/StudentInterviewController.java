package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.InterviewEvaluationResponse;
import com.careerlabs.lms.api.placement.dto.response.InterviewRoundResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewResponse;
import com.careerlabs.lms.api.placement.service.PlacementInterviewService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Student-facing view of their scheduled placement interviews and rounds. */
@RestController
@RequestMapping("/api/student/interviews")
public class StudentInterviewController {

    private final PlacementInterviewService interviewService;

    public StudentInterviewController(PlacementInterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlacementInterviewResponse>>> myInterviews(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(interviewService.listForStudent(principal.id())));
    }

    @GetMapping("/evaluations")
    public ResponseEntity<ApiResponse<List<InterviewEvaluationResponse>>> myEvaluations(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        // Evaluations are listed against the student's own interviews.
        List<PlacementInterviewResponse> interviews = interviewService.listForStudent(principal.id());
        List<InterviewEvaluationResponse> all = new java.util.ArrayList<>();
        for (PlacementInterviewResponse i : interviews) {
            all.addAll(interviewService.listEvaluations(i.driveId(), i.id()));
        }
        return ResponseEntity.ok(ApiResponse.of(all));
    }
}