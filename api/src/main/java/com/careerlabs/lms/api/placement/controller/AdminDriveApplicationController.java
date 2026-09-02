package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveApplicationStatusRequest;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveApplicationResponse;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationStatusHistoryResponse;
import com.careerlabs.lms.api.placement.service.DriveApplicationService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Admin review of the applications a single Drive has received - listing, status transitions, and history. */
@RestController
@RequestMapping("/api/admin/drives/{driveId}/applications")
public class AdminDriveApplicationController {

    private final DriveApplicationService driveApplicationService;

    public AdminDriveApplicationController(DriveApplicationService driveApplicationService) {
        this.driveApplicationService = driveApplicationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminDriveApplicationResponse>>> list(@PathVariable Long driveId) {
        return ResponseEntity.ok(ApiResponse.of(driveApplicationService.listForDrive(driveId)));
    }

    @PatchMapping("/{appId}")
    public ResponseEntity<ApiResponse<AdminDriveApplicationResponse>> updateStatus(
            @PathVariable Long driveId, @PathVariable Long appId,
            @Valid @RequestBody UpdateDriveApplicationStatusRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AdminDriveApplicationResponse response = driveApplicationService.updateStatus(
                driveId, appId, request.getStatus(), request.getNote(), principal.id());
        return ResponseEntity.ok(ApiResponse.of("Application status updated", response));
    }

    @GetMapping("/{appId}/history")
    public ResponseEntity<ApiResponse<List<DriveApplicationStatusHistoryResponse>>> history(
            @PathVariable Long driveId, @PathVariable Long appId) {
        return ResponseEntity.ok(ApiResponse.of(driveApplicationService.getStatusHistory(driveId, appId)));
    }
}
