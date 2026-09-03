package com.careerlabs.lms.api.dashboard.service;

import com.careerlabs.lms.api.dashboard.dto.response.AdminDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.StudentDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.SuperAdminDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.TrainerDashboardResponse;

public interface DashboardService {

    AdminDashboardResponse getAdminDashboard();

    SuperAdminDashboardResponse getSuperAdminDashboard();

    TrainerDashboardResponse getTrainerDashboard(Long userId);

    /** @param userId the authenticated principal's user id (JWT subject), not a Student id. */
    StudentDashboardResponse getStudentDashboard(Long userId);
}
