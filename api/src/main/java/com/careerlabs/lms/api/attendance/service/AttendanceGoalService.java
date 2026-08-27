package com.careerlabs.lms.api.attendance.service;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceGoalResponse;

public interface AttendanceGoalService {

    AttendanceGoalResponse getGoal(Long userId);

    AttendanceGoalResponse setGoal(Long userId, int targetPercentage);
}
