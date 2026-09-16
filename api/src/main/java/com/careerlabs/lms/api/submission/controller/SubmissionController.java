package com.careerlabs.lms.api.submission.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.submission.dto.request.ApproveRejectSubmissionRequest;
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

import com.careerlabs.lms.api.submission.dto.response.SubmissionStatus;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/assignments/{assignmentId}/submissions")
public class SubmissionController {

    private final AssignmentSubmissionService submissionService;

    public SubmissionController(AssignmentSubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<SubmissionListResponse>> list(
            @PathVariable Long assignmentId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) String evaluation,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(submissionService.listByAssignment(
                assignmentId, search, status, evaluation, dateFrom, dateTo, principal)));
    }

    @PatchMapping("/{submissionId}")
    public ResponseEntity<ApiResponse<SubmissionRowResponse>> grade(@PathVariable Long assignmentId,
                                                                      @PathVariable Long submissionId,
                                                                      @Valid @RequestBody GradeSubmissionRequest request,
                                                                      @AuthenticationPrincipal JwtUserPrincipal principal) {
        SubmissionRowResponse response = submissionService.grade(assignmentId, submissionId, request, principal);
        return ResponseEntity.ok(ApiResponse.of("Submission graded", response));
    }

    @PostMapping("/{submissionId}/approval")
    public ResponseEntity<ApiResponse<SubmissionRowResponse>> approveOrReject(
            @PathVariable Long assignmentId,
            @PathVariable Long submissionId,
            @Valid @RequestBody ApproveRejectSubmissionRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        SubmissionRowResponse response = submissionService.approveOrReject(
                assignmentId, submissionId, request, principal != null ? principal.email() : "Admin", principal);
        return ResponseEntity.ok(ApiResponse.of("Submission " + request.getAction().toLowerCase() + "d", response));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SubmissionRowResponse>> submit(@PathVariable Long assignmentId,
                                                                       @AuthenticationPrincipal JwtUserPrincipal principal,
                                                                       @RequestPart(value = "files", required = false) List<MultipartFile> files,
                                                                       @RequestPart(value = "file", required = false) MultipartFile file,
                                                                       @RequestParam(required = false) String notes) {
        List<MultipartFile> allFiles = new ArrayList<>();
        if (files != null) {
            allFiles.addAll(files.stream().filter(f -> f != null && !f.isEmpty()).toList());
        }
        if (file != null && !file.isEmpty()) {
            if (allFiles.stream().noneMatch(f -> f.getOriginalFilename() != null && f.getOriginalFilename().equals(file.getOriginalFilename()) && f.getSize() == file.getSize())) {
                allFiles.add(file);
            }
        }
        SubmissionRowResponse response = submissionService.submit(assignmentId, principal.id(), allFiles, notes);
        return ResponseEntity.status(201).body(ApiResponse.of("Assignment submitted", response));
    }
}
