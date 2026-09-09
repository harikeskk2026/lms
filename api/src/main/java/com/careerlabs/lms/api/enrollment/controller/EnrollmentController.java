package com.careerlabs.lms.api.enrollment.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.enrollment.dto.request.BulkEnrollStudentsRequest;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentResponse;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentsPageResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;
import com.careerlabs.lms.api.enrollment.service.EnrollmentService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.user.entity.Role;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    public EnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    @PostMapping("/{id}/enroll")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(@PathVariable Long id,
                                                                   @AuthenticationPrincipal JwtUserPrincipal principal) {
        EnrollmentResponse response = enrollmentService.enroll(id, principal.id(), Role.valueOf(principal.role()));
        return ResponseEntity.status(201).body(ApiResponse.of("Enrolled successfully", response));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> mine(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(enrollmentService.listMine(principal.id())));
    }

    @GetMapping("/{id}/enrollments")
    public ResponseEntity<ApiResponse<CourseEnrolledStudentsPageResponse>> listCourseEnrollments(
            @PathVariable Long id,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        CourseEnrolledStudentsPageResponse response = enrollmentService.getCourseEnrollments(id, search, batchId, status, page, limit);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/{id}/enrollments")
    public ResponseEntity<ApiResponse<CourseEnrolledStudentResponse>> enrollStudent(
            @PathVariable Long id,
            @Valid @RequestBody EnrollStudentRequest request) {
        CourseEnrolledStudentResponse response = enrollmentService.enrollStudentByAdmin(id, request);
        return ResponseEntity.status(201).body(ApiResponse.of("Student enrolled successfully", response));
    }

    @PostMapping("/{id}/enrollments/bulk")
    public ResponseEntity<ApiResponse<List<CourseEnrolledStudentResponse>>> bulkEnrollStudents(
            @PathVariable Long id,
            @Valid @RequestBody BulkEnrollStudentsRequest request) {
        List<CourseEnrolledStudentResponse> response = enrollmentService.bulkEnrollStudentsByAdmin(id, request);
        return ResponseEntity.status(201).body(ApiResponse.of("Students enrolled successfully", response));
    }

    @DeleteMapping("/{id}/enrollments/{enrollmentId}")
    public ResponseEntity<ApiResponse<Void>> unenrollStudent(
            @PathVariable Long id,
            @PathVariable Long enrollmentId) {
        enrollmentService.unenrollStudentByAdmin(id, enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Student unenrolled successfully", null));
    }
}
