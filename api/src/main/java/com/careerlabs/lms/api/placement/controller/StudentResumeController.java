package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.ResumeUploadResponse;
import com.careerlabs.lms.api.placement.service.ResumeDataService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Two distinct resume features: the Resume Builder (structured form-state,
 * generate/preview only, GET/PUT /resume - the flat JSON payload is passed
 * through as-is, no fixed schema on the backend) and Resume Upload (an actual
 * PDF file attached to the student's profile, POST /resume-file, backs
 * Student.resumeUrl).
 */
@RestController
@RequestMapping("/api/student")
public class StudentResumeController {

    private final ResumeDataService resumeDataService;

    public StudentResumeController(ResumeDataService resumeDataService) {
        this.resumeDataService = resumeDataService;
    }

    @GetMapping("/resume")
    public ResponseEntity<ApiResponse<Object>> get(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(resumeDataService.get(principal.id())));
    }

    @PutMapping("/resume")
    public ResponseEntity<ApiResponse<Object>> save(@RequestBody Object content,
                                                       @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Resume saved", resumeDataService.save(principal.id(), content)));
    }

    @PostMapping(path = "/resume-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ResumeUploadResponse>> uploadFile(@RequestPart("file") MultipartFile file,
                                                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        ResumeUploadResponse response = resumeDataService.uploadFile(principal.id(), file);
        return ResponseEntity.ok(ApiResponse.of("Resume uploaded", response));
    }
}
