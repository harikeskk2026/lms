package com.careerlabs.lms.api.student.controller;

import com.careerlabs.lms.api.academic.dto.request.AcademicDetailsRequest;
import com.careerlabs.lms.api.academic.dto.response.AcademicDetailsResponse;
import com.careerlabs.lms.api.academic.service.AcademicDetailsService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service counterpart to {@link com.careerlabs.lms.api.academic.controller.AcademicDetailsController}
 * (the admin-only {@code /api/students/{studentId}/academic-details} surface) - same
 * {@link AcademicDetailsService}, same {@code AcademicDetails} row, just scoped to the
 * caller's own student record instead of an admin-supplied studentId. This is what lets
 * a student fill in their own 10th/12th/Diploma/UG/PG details from My Profile, which
 * PlacementEligibilityGuard then reads as the single source of truth for eligibility.
 */
@RestController
@RequestMapping("/api/student/academic-details")
public class StudentAcademicDetailsController {

    private final AcademicDetailsService academicDetailsService;
    private final StudentRepository studentRepository;

    public StudentAcademicDetailsController(AcademicDetailsService academicDetailsService,
                                             StudentRepository studentRepository) {
        this.academicDetailsService = academicDetailsService;
        this.studentRepository = studentRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AcademicDetailsResponse>> get(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Long studentId = resolveStudentId(principal.id());
        return ResponseEntity.ok(ApiResponse.of(academicDetailsService.get(studentId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<AcademicDetailsResponse>> update(@Valid @RequestBody AcademicDetailsRequest request,
                                                                          @AuthenticationPrincipal JwtUserPrincipal principal) {
        Long studentId = resolveStudentId(principal.id());
        AcademicDetailsResponse response = academicDetailsService.save(studentId, request);
        return ResponseEntity.ok(ApiResponse.of("Academic details updated", response));
    }

    private Long resolveStudentId(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"))
                .getId();
    }
}
