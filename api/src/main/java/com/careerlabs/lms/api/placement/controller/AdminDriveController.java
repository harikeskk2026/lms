package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.CreateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveRequest;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveResponse;
import com.careerlabs.lms.api.placement.dto.response.DrivePageResponse;
import com.careerlabs.lms.api.placement.service.DriveService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/drives")
public class AdminDriveController {

    private final DriveService driveService;

    public AdminDriveController(DriveService driveService) {
        this.driveService = driveService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DrivePageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) Integer size) {
        int effectiveLimit = (size != null && size > 0) ? size : limit;
        return ResponseEntity.ok(ApiResponse.of(driveService.pageForAdmin(search, status, page, effectiveLimit)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminDriveResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(driveService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminDriveResponse>> create(@Valid @RequestBody CreateDriveRequest request,
                                                                     @AuthenticationPrincipal JwtUserPrincipal principal) {
        AdminDriveResponse response = driveService.create(request, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Placement opportunity created", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminDriveResponse>> update(@PathVariable Long id,
                                                                     @Valid @RequestBody UpdateDriveRequest request) {
        AdminDriveResponse response = driveService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Placement opportunity updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        driveService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Placement opportunity deleted", null));
    }
}
