package com.careerlabs.lms.api.report.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
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
import com.careerlabs.lms.api.report.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<AttendanceReportResponse>> getAttendanceReport(
            @ModelAttribute AttendanceReportRequest request) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getAttendanceReport(request)));
    }

    @GetMapping("/performance")
    public ResponseEntity<ApiResponse<PerformanceReportResponse>> getPerformanceReport(
            @ModelAttribute PerformanceReportRequest request) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getPerformanceReport(request)));
    }

    @GetMapping("/performance/students/{studentId}")
    public ResponseEntity<ApiResponse<ReportStudentResponse>> getStudentPerformance(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getStudentPerformance(studentId)));
    }

    @GetMapping("/at-risk")
    public ResponseEntity<ApiResponse<List<ReportStudentResponse>>> getAtRiskStudents(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getAtRiskStudents(batchId)));
    }

    @GetMapping("/placement")
    public ResponseEntity<ApiResponse<PlacementReportResponse>> getPlacementReport(
            @ModelAttribute PlacementReportRequest request) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getPlacementReport(request)));
    }

    @GetMapping("/export")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> export(
            @RequestParam String type,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.of(reportService.export(type, batchId, startDate, endDate)));
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<OverviewResponse>> getOverview() {
        return ResponseEntity.ok(ApiResponse.of(reportService.getOverview()));
    }

    @GetMapping("/batch-health")
    public ResponseEntity<ApiResponse<List<BatchHealthResponse>>> getBatchHealth() {
        return ResponseEntity.ok(ApiResponse.of(reportService.getBatchHealth()));
    }

    @GetMapping("/batch-health/{batchId}")
    public ResponseEntity<ApiResponse<BatchHealthResponse>> getBatchHealth(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getBatchHealth(batchId)));
    }

    @GetMapping("/quiz")
    public ResponseEntity<ApiResponse<QuizAnalyticsResponse>> getQuizAnalytics(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long courseId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getQuizAnalytics(batchId, courseId)));
    }

    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<AssignmentAnalyticsResponse>> getAssignmentAnalytics(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getAssignmentAnalytics(batchId)));
    }

    @GetMapping("/engagement")
    public ResponseEntity<ApiResponse<EngagementResponse>> getEngagement(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getEngagement(batchId)));
    }

    @GetMapping("/activity-trend")
    public ResponseEntity<ApiResponse<List<LmsActivityPointResponse>>> getActivityTrend() {
        return ResponseEntity.ok(ApiResponse.of(reportService.getActivityTrend()));
    }

    @GetMapping("/leaderboard/students")
    public ResponseEntity<ApiResponse<List<LeaderboardEntryResponse>>> getTopStudents(
            @RequestParam(required = false) Long batchId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getTopStudents(batchId, limit)));
    }

    @GetMapping("/leaderboard/batches")
    public ResponseEntity<ApiResponse<List<LeaderboardEntryResponse>>> getBatchLeaderboard() {
        return ResponseEntity.ok(ApiResponse.of(reportService.getBatchLeaderboard()));
    }

    @GetMapping("/declining-students")
    public ResponseEntity<ApiResponse<List<DecliningStudentResponse>>> getDecliningStudents(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getDecliningStudents(batchId)));
    }

    @GetMapping("/placement-readiness")
    public ResponseEntity<ApiResponse<List<PlacementReadinessResponse>>> getPlacementReadiness(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getPlacementReadiness(batchId)));
    }

    @GetMapping("/correlations")
    public ResponseEntity<ApiResponse<List<CorrelationResponse>>> getCorrelations(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(reportService.getCorrelations(batchId)));
    }
}
