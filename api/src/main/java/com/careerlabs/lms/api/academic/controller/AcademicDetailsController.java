package com.careerlabs.lms.api.academic.controller;

import com.careerlabs.lms.api.academic.dto.request.AcademicDetailsRequest;
import com.careerlabs.lms.api.academic.dto.response.AcademicDetailsResponse;
import com.careerlabs.lms.api.academic.service.AcademicDetailsService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Nested under {@code /api/students/**}, which {@code SecurityConfig} already
 * restricts to ADMIN - no separate authorization rule needed here.
 */
@RestController
@RequestMapping("/api/students/{studentId}/academic-details")
public class AcademicDetailsController {

    private final AcademicDetailsService academicDetailsService;

    public AcademicDetailsController(AcademicDetailsService academicDetailsService) {
        this.academicDetailsService = academicDetailsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AcademicDetailsResponse>> get(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.of(academicDetailsService.get(studentId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<AcademicDetailsResponse>> update(@PathVariable Long studentId,
                                                                        @Valid @RequestBody AcademicDetailsRequest request) {
        AcademicDetailsResponse response = academicDetailsService.save(studentId, request);
        return ResponseEntity.ok(ApiResponse.of("Academic details updated", response));
    }
}
