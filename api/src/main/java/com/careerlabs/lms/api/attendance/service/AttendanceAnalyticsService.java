package com.careerlabs.lms.api.attendance.service;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceCommandCenterResponse;
import com.careerlabs.lms.api.attendance.dto.response.TodayClassResponse;

import java.util.List;

public interface AttendanceAnalyticsService {

    AttendanceCommandCenterResponse getCommandCenter();

    AttendanceCommandCenterResponse getCommandCenterForBatches(List<Long> batchIds);

    List<TodayClassResponse> getTodayClasses();

    List<TodayClassResponse> getTodayClasses(java.time.LocalDate date);
}
