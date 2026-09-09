package com.careerlabs.lms.api.announcement.controller;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementTemplateRequest;
import com.careerlabs.lms.api.announcement.dto.request.ApplyTemplateRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementTemplateResponse;
import com.careerlabs.lms.api.announcement.dto.response.ResolvedTemplateResponse;
import com.careerlabs.lms.api.announcement.service.AnnouncementTemplateService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/announcement-templates")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
public class AdminAnnouncementTemplateController {

    private final AnnouncementTemplateService templateService;

    public AdminAnnouncementTemplateController(AnnouncementTemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnnouncementTemplateResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(templateService.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AnnouncementTemplateResponse>> create(
            @Valid @RequestBody AnnouncementTemplateRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Template created", templateService.create(request, principal.id())));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AnnouncementTemplateResponse>> update(
            @PathVariable Long id, @Valid @RequestBody AnnouncementTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Template updated", templateService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        templateService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Template deleted", null));
    }

    @PostMapping("/apply")
    public ResponseEntity<ApiResponse<ResolvedTemplateResponse>> apply(@Valid @RequestBody ApplyTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.of(templateService.apply(request)));
    }
}
