package com.careerlabs.lms.api.enrollment.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentContactResponse;
import com.careerlabs.lms.api.enrollment.service.EnrollmentContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/enrollment-contact")
public class EnrollmentContactController {

    private final EnrollmentContactService enrollmentContactService;

    public EnrollmentContactController(EnrollmentContactService enrollmentContactService) {
        this.enrollmentContactService = enrollmentContactService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<EnrollmentContactResponse>> getEnrollmentContact() {
        return ResponseEntity.ok(ApiResponse.of(enrollmentContactService.getContactInfo()));
    }
}