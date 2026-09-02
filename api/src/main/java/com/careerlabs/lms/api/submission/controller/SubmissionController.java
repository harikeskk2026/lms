package com.careerlabs.lms.api.submission.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.submission.dto.request.GradeSubmissionRequest;
import com.careerlabs.lms.api.submission.dto.response.SubmissionListResponse;
import com.careerlabs.lms.api.submission.dto.response.SubmissionRowResponse;
import com.careerlabs.lms.api.submission.service.AssignmentSubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/assignments/{assignmentId}/submissions")
public class SubmissionController {

    private final AssignmentSubmissionService submissionService;

    public SubmissionController(AssignmentSubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<SubmissionListResponse>> list(@PathVariable Long assignmentId) {
        return ResponseEntity.ok(ApiResponse.of(submissionService.listByAssignment(assignmentId)));
    }

    @PatchMapping("/{submissionId}")
    public ResponseEntity<ApiResponse<SubmissionRowResponse>> grade(@PathVariable Long assignmentId,
                                                                      @PathVariable Long submissionId,
                                                                      @Valid @RequestBody GradeSubmissionRequest request) {
        SubmissionRowResponse response = submissionService.grade(assignmentId, submissionId, request);
        return ResponseEntity.ok(ApiResponse.of("Submission graded", response));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SubmissionRowResponse>> submit(@PathVariable Long assignmentId,
                                                                       @AuthenticationPrincipal JwtUserPrincipal principal,
                                                                       @RequestPart("file") MultipartFile file,
                                                                       @RequestParam(required = false) String notes) {
        SubmissionRowResponse response = submissionService.submit(assignmentId, principal.id(), file, notes);
        return ResponseEntity.status(201).body(ApiResponse.of("Assignment submitted", response));
    }
}
