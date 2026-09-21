package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.CreateAptitudeTipRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateAptitudeTipRequest;
import com.careerlabs.lms.api.quiz.dto.response.AptitudeTipPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.AptitudeTipResponse;
import com.careerlabs.lms.api.quiz.service.AptitudeTipService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin management of aptitude tips shown on the student Interview Prep tab.
 */
@RestController
@RequestMapping("/api/admin/aptitude-tips")
public class AdminAptitudeTipController {

    private final AptitudeTipService aptitudeTipService;

    public AdminAptitudeTipController(AptitudeTipService aptitudeTipService) {
        this.aptitudeTipService = aptitudeTipService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AptitudeTipPageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(aptitudeTipService.page(search, active, page, limit)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AptitudeTipResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(aptitudeTipService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AptitudeTipResponse>> create(
            @Valid @RequestBody CreateAptitudeTipRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AptitudeTipResponse response = aptitudeTipService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Aptitude tip created", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AptitudeTipResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateAptitudeTipRequest request) {
        AptitudeTipResponse response = aptitudeTipService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Aptitude tip updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        aptitudeTipService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Aptitude tip deleted", null));
    }
}