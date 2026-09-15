package com.careerlabs.lms.api.report.service;

import com.careerlabs.lms.api.report.dto.request.AttendanceReportRequest;
import com.careerlabs.lms.api.report.dto.request.PerformanceReportRequest;
import com.careerlabs.lms.api.report.dto.request.PlacementReportRequest;
import com.careerlabs.lms.api.report.dto.response.AssignmentAnalyticsResponse;
import com.careerlabs.lms.api.report.dto.response.AttendanceReportResponse;
import com.careerlabs.lms.api.report.dto.response.BatchHealthResponse;
import com.careerlabs.lms.api.report.dto.response.CorrelationResponse;
import com.careerlabs.lms.api.report.dto.response.DecliningStudentResponse;
import com.careerlabs.lms.api.report.dto.response.EngagementResponse;
import com.careerlabs.lms.api.report.dto.response.LeaderboardEntryResponse;
import com.careerlabs.lms.api.report.dto.response.LmsActivityPointResponse;
import com.careerlabs.lms.api.report.dto.response.OverviewResponse;
import com.careerlabs.lms.api.report.dto.response.PerformanceReportResponse;
import com.careerlabs.lms.api.report.dto.response.PlacementReadinessResponse;
import com.careerlabs.lms.api.report.dto.response.PlacementReportResponse;
import com.careerlabs.lms.api.report.dto.response.QuizAnalyticsResponse;
import com.careerlabs.lms.api.report.dto.response.ReportStudentResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface ReportService {

    AttendanceReportResponse getAttendanceReport(AttendanceReportRequest request);

    PerformanceReportResponse getPerformanceReport(PerformanceReportRequest request);

    ReportStudentResponse getStudentPerformance(Long studentId);

    List<ReportStudentResponse> getAtRiskStudents(Long batchId);

    PlacementReportResponse getPlacementReport(PlacementReportRequest request);

    List<Map<String, Object>> export(String type, Long batchId, Long courseId, LocalDate startDate, LocalDate endDate);

    OverviewResponse getOverview();

    OverviewResponse getOverview(PerformanceReportResponse performance);

    List<BatchHealthResponse> getBatchHealth();

    BatchHealthResponse getBatchHealth(Long batchId);

    QuizAnalyticsResponse getQuizAnalytics(Long batchId, Long courseId);

    AssignmentAnalyticsResponse getAssignmentAnalytics(Long batchId);

    EngagementResponse getEngagement(Long batchId);

    List<LmsActivityPointResponse> getActivityTrend();

    List<LeaderboardEntryResponse> getTopStudents(Long batchId, int limit);

    List<LeaderboardEntryResponse> getBatchLeaderboard();

    List<DecliningStudentResponse> getDecliningStudents(Long batchId);

    List<PlacementReadinessResponse> getPlacementReadiness(Long batchId, Long courseId);

    List<CorrelationResponse> getCorrelations(Long batchId);
}
