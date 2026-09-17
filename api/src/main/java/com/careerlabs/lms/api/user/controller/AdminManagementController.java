package com.careerlabs.lms.api.user.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.user.dto.request.AdminCreateRequest;
import com.careerlabs.lms.api.user.dto.request.AdminResetPasswordRequest;
import com.careerlabs.lms.api.user.dto.request.AdminUpdateRequest;
import com.careerlabs.lms.api.user.dto.response.AdminPageResponse;
import com.careerlabs.lms.api.user.dto.response.AdminResponse;
import com.careerlabs.lms.api.user.service.UserAdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminManagementController {

    private final UserAdminService userAdminService;

    public AdminManagementController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping("/admins")
    public ResponseEntity<ApiResponse<AdminPageResponse>> listAdmins(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        AdminPageResponse response = userAdminService.listAdmins(search, status, page, limit);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<AdminResponse>> getAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(userAdminService.getAdmin(id)));
    }

    @PostMapping("/admins")
    public ResponseEntity<ApiResponse<AdminResponse>> createAdmin(@Valid @RequestBody AdminCreateRequest request) {
        AdminResponse response = userAdminService.createAdmin(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Admin created successfully", response));
    }

    @PutMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<AdminResponse>> updateAdmin(@PathVariable Long id,
                                                                    @Valid @RequestBody AdminUpdateRequest request) {
        AdminResponse response = userAdminService.updateAdmin(id, request);
        return ResponseEntity.ok(ApiResponse.of("Admin updated successfully", response));
    }

    @DeleteMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAdmin(@PathVariable Long id,
                                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        userAdminService.deleteAdmin(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Admin deleted successfully", null));
    }

    @PatchMapping("/admins/{id}/status")
    public ResponseEntity<ApiResponse<AdminResponse>> toggleStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AdminResponse response = userAdminService.toggleAdminStatus(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Admin status updated", response));
    }

    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long userId,
            @Valid @RequestBody AdminResetPasswordRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        userAdminService.resetPassword(principal, userId, request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.of("Password reset successfully", null));
    }
}
