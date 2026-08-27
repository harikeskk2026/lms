package com.careerlabs.lms.api.enrollment.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;
import com.careerlabs.lms.api.enrollment.service.EnrollmentService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    public EnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(@PathVariable Long id,
                                                                     @AuthenticationPrincipal JwtUserPrincipal principal) {
        EnrollmentResponse response = enrollmentService.enroll(id, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Enrolled successfully", response));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> mine(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(enrollmentService.listMine(principal.id())));
    }
}
