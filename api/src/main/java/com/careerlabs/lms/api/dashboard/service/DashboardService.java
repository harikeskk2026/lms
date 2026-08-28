package com.careerlabs.lms.api.dashboard.service;

import com.careerlabs.lms.api.dashboard.dto.response.AdminDashboardResponse;
import com.careerlabs.lms.api.dashboard.dto.response.StudentDashboardResponse;

public interface DashboardService {

    AdminDashboardResponse getAdminDashboard();

    /** @param userId the authenticated principal's user id (JWT subject), not a Student id. */
    StudentDashboardResponse getStudentDashboard(Long userId);
}
