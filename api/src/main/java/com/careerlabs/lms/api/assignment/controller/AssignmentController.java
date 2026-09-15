package com.careerlabs.lms.api.assignment.controller;

import com.careerlabs.lms.api.assignment.dto.request.AssignmentRequest;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentPageResponse;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.UploadResponse;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.service.AssignmentService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AssignmentPageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) AssignmentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDateTo,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AssignmentPageResponse response = assignmentService.list(
                search, courseId, batchId, status, dueDateFrom, dueDateTo, page, limit, principal);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(assignmentService.get(id, principal)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AssignmentResponse>> create(
            @Valid @RequestBody AssignmentRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AssignmentResponse response = assignmentService.create(request, principal);
        return ResponseEntity.status(201).body(ApiResponse.of("Assignment created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody AssignmentRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AssignmentResponse response = assignmentService.update(id, request, principal);
        return ResponseEntity.ok(ApiResponse.of("Assignment updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        assignmentService.delete(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Assignment deleted", null));
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<AssignmentResponse>> publish(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Assignment published", assignmentService.publish(id, principal)));
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<ApiResponse<AssignmentResponse>> close(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Assignment closed", assignmentService.close(id, principal)));
    }

    @PatchMapping("/{id}/reopen")
    public ResponseEntity<ApiResponse<AssignmentResponse>> reopen(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Assignment reopened", assignmentService.reopen(id, principal)));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadResponse>> upload(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.of(assignmentService.uploadAttachment(file)));
    }
}
