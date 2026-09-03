package com.careerlabs.lms.api.dashboard.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.dashboard.dto.response.AdminDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.SuperAdminDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.TrainerDashboardResponse;
import com.careerlabs.lms.api.dashboard.service.DashboardService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    public AdminDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.of(dashboardService.getAdminDashboard()));
    }

    @GetMapping("/superadmin")
    public ResponseEntity<ApiResponse<SuperAdminDashboardResponse>> getSuperAdminDashboard() {
        return ResponseEntity.ok(ApiResponse.of(dashboardService.getSuperAdminDashboard()));
    }

    @GetMapping("/trainer")
    public ResponseEntity<ApiResponse<TrainerDashboardResponse>> getTrainerDashboard(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        Long userId = principal != null ? principal.id() : null;
        return ResponseEntity.ok(ApiResponse.of(dashboardService.getTrainerDashboard(userId)));
    }
}
