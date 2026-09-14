package com.careerlabs.lms.api.attendance.controller;

import com.careerlabs.lms.api.attendance.dto.AttendanceAlertResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceAnalyticsResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceHistoryResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceOverviewItemResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceRecordRequest;
import com.careerlabs.lms.api.attendance.dto.AttendanceSheetItemResponse;
import com.careerlabs.lms.api.attendance.dto.BatchAttendanceMatrixResponse;
import com.careerlabs.lms.api.attendance.dto.DailyClassRequest;
import com.careerlabs.lms.api.attendance.dto.DailyClassResponse;
import com.careerlabs.lms.api.attendance.dto.LowAttendanceStudentResponse;
import com.careerlabs.lms.api.attendance.dto.MarkAttendanceRequest;
import com.careerlabs.lms.api.attendance.dto.request.AttendanceEditRequest;
import com.careerlabs.lms.api.attendance.dto.request.AttendancePolicyRequest;
import com.careerlabs.lms.api.attendance.dto.request.CorrectionReviewRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCommandCenterResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCorrectionResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceHistoryPageResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendancePolicyResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceRecordResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceVerificationResponse;
import com.careerlabs.lms.api.attendance.dto.response.TodayClassResponse;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import com.careerlabs.lms.api.attendance.service.AttendanceAnalyticsService;
import com.careerlabs.lms.api.attendance.service.AttendanceCorrectionService;
import com.careerlabs.lms.api.attendance.service.AttendancePolicyService;
import com.careerlabs.lms.api.attendance.service.AttendanceService;
import com.careerlabs.lms.api.attendance.service.AttendanceVerificationService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminAttendanceController {

    private final AttendanceService attendanceService;
    private final AttendancePolicyService attendancePolicyService;
    private final AttendanceAnalyticsService attendanceAnalyticsService;
    private final AttendanceCorrectionService attendanceCorrectionService;
    private final AttendanceVerificationService attendanceVerificationService;

    public AdminAttendanceController(
            AttendanceService attendanceService,
            AttendancePolicyService attendancePolicyService,
            AttendanceAnalyticsService attendanceAnalyticsService,
            AttendanceCorrectionService attendanceCorrectionService,
            AttendanceVerificationService attendanceVerificationService) {
        this.attendanceService = attendanceService;
        this.attendancePolicyService = attendancePolicyService;
        this.attendanceAnalyticsService = attendanceAnalyticsService;
        this.attendanceCorrectionService = attendanceCorrectionService;
        this.attendanceVerificationService = attendanceVerificationService;
    }

    // ─── Daily Classes ────────────────────────────────────────────────────────

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<DailyClassResponse>>> getClasses(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) ClassStatus status,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        List<DailyClassResponse> response = attendanceService.getClasses(batchId, date, status, principal);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<DailyClassResponse>> createClass(
            @Valid @RequestBody DailyClassRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        DailyClassResponse response = attendanceService.createClass(request, principal);
        return ResponseEntity.status(201).body(ApiResponse.of("Class created", response));
    }

    @PatchMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<DailyClassResponse>> updateClass(
            @PathVariable Long id,
            @RequestBody DailyClassRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        DailyClassResponse response = attendanceService.updateClass(id, request, principal);
        return ResponseEntity.ok(ApiResponse.of("Class updated", response));
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteClass(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        attendanceService.deleteClass(id, principal);
        return ResponseEntity.ok(ApiResponse.of("Class deleted successfully", null));
    }

    // ─── Attendance Overview & Analytics ───────────────────────────────────────

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<List<AttendanceOverviewItemResponse>>> getAttendanceOverview() {
        List<AttendanceOverviewItemResponse> response = attendanceService.getAttendanceOverview();
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/analytics")
    public ResponseEntity<ApiResponse<AttendanceAnalyticsResponse>> getAttendanceAnalytics(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Integer days) {
        AttendanceAnalyticsResponse response = attendanceService.getAttendanceAnalytics(batchId, days);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/low")
    public ResponseEntity<ApiResponse<List<LowAttendanceStudentResponse>>> getLowAttendanceStudents(
            @RequestParam(defaultValue = "75.0") Double threshold,
            @RequestParam(required = false) Long batchId) {
        List<LowAttendanceStudentResponse> response = attendanceService.getLowAttendanceStudents(threshold, batchId);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/student/{id}")
    public ResponseEntity<ApiResponse<AttendanceHistoryResponse>> getStudentAttendanceHistory(@PathVariable Long id) {
        AttendanceHistoryResponse response = attendanceService.getStudentAttendanceHistory(id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/batch/{id}")
    public ResponseEntity<ApiResponse<BatchAttendanceMatrixResponse>> getBatchAttendanceDetail(
            @PathVariable Long id,
            @RequestParam(required = false) String month) {
        BatchAttendanceMatrixResponse response = attendanceService.getBatchAttendanceDetail(id, month);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    // ─── Attendance Alerts ──────────────────────────────────────────────────────

    @GetMapping("/attendance/alerts")
    public ResponseEntity<ApiResponse<List<AttendanceAlertResponse>>> getAttendanceAlerts(
            @RequestParam(required = false) Boolean resolved,
            @RequestParam(required = false) Long batchId) {
        List<AttendanceAlertResponse> response = attendanceService.getAttendanceAlerts(resolved, batchId);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/attendance/alerts/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateAlerts(
            @RequestParam(defaultValue = "75.0") Double threshold) {
        Map<String, Object> result = attendanceService.generateAttendanceAlerts(threshold);
        return ResponseEntity.ok(ApiResponse.of("Alerts generated", result));
    }

    @PatchMapping("/attendance/alerts/{id}/resolve")
    public ResponseEntity<ApiResponse<AttendanceAlertResponse>> resolveAlert(@PathVariable Long id) {
        AttendanceAlertResponse response = attendanceService.resolveAlert(id);
        return ResponseEntity.ok(ApiResponse.of("Alert resolved", response));
    }

    // ─── Attendance Marking ─────────────────────────────────────────────────────

    @GetMapping("/attendance/{classId}")
    public ResponseEntity<ApiResponse<List<AttendanceSheetItemResponse>>> getAttendanceSheet(
            @PathVariable Long classId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        List<AttendanceSheetItemResponse> response = attendanceService.getAttendanceSheet(classId, principal);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/attendance/{classId}")
    public ResponseEntity<ApiResponse<List<AttendanceSheetItemResponse>>> markAttendance(
            @PathVariable Long classId,
            @RequestParam(defaultValue = "true") boolean submit,
            @RequestBody MarkAttendanceRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        Long markerId = principal != null ? principal.id() : null;
        List<AttendanceSheetItemResponse> response = attendanceService.markAttendance(
                classId, request.records() != null ? request.records() : List.of(), submit, markerId);
        return ResponseEntity.ok(ApiResponse.of(submit ? "Attendance saved" : "Draft saved", response));
    }

    @PatchMapping("/attendance/{classId}/student/{studentId}")
    public ResponseEntity<ApiResponse<List<AttendanceSheetItemResponse>>> markSingleAttendance(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        AttendStatus status = AttendStatus.valueOf(body.getOrDefault("status", "PRESENT"));
        Long markerId = principal != null ? principal.id() : null;
        List<AttendanceSheetItemResponse> response = attendanceService.markAttendance(
                classId, List.of(new AttendanceRecordRequest(studentId, status)), true, markerId);
        return ResponseEntity.ok(ApiResponse.of("Attendance updated", response));
    }

    @GetMapping("/attendance/{classId}/copy-previous")
    public ResponseEntity<ApiResponse<List<AttendanceSheetItemResponse>>> copyPreviousAttendance(
            @PathVariable Long classId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        List<AttendanceSheetItemResponse> response = attendanceService.getPreviousAttendanceSheet(classId, principal);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PutMapping("/attendance/{id}")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> editAttendanceRecord(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody AttendanceEditRequest request) {
        AttendanceRecordResponse response = attendanceService.editAttendanceRecord(
                id, principal.id(), request.getStatus(), request.getRemarks());
        return ResponseEntity.ok(ApiResponse.of("Attendance record updated", response));
    }

    // ─── History ────────────────────────────────────────────────────────────────

    @GetMapping("/attendance/history")
    public ResponseEntity<ApiResponse<AttendanceHistoryPageResponse>> getAttendanceHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) AttendStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        AttendanceHistoryPageResponse response = attendanceService.getAttendanceHistory(
                from, to, batchId, courseId, classId, studentId, status, search, page, limit);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    // ─── Command Center & Today ─────────────────────────────────────────────────

    @GetMapping("/attendance/dashboard")
    public ResponseEntity<ApiResponse<AttendanceCommandCenterResponse>> getCommandCenter() {
        return ResponseEntity.ok(ApiResponse.of(attendanceAnalyticsService.getCommandCenter()));
    }

    @GetMapping("/attendance/today")
    public ResponseEntity<ApiResponse<List<TodayClassResponse>>> getTodayClasses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.of(attendanceAnalyticsService.getTodayClasses(date)));
    }

    // ─── Correction Requests ────────────────────────────────────────────────────

    @GetMapping("/attendance/corrections")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> getCorrections(
            @RequestParam(required = false) CorrectionStatus status) {
        return ResponseEntity.ok(ApiResponse.of(attendanceCorrectionService.listForAdmin(status)));
    }

    @PutMapping("/attendance/corrections/{id}")
    public ResponseEntity<ApiResponse<AttendanceCorrectionResponse>> reviewCorrection(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody CorrectionReviewRequest request) {
        AttendanceCorrectionResponse response = attendanceCorrectionService.review(
                id, principal.id(), request.getDecision(), request.getComment());
        return ResponseEntity.ok(ApiResponse.of("Correction reviewed", response));
    }

    /** Read-only: cross-checks the requesting student's Scheduled Class join records for that day. */
    @GetMapping("/attendance/corrections/{id}/verify")
    public ResponseEntity<ApiResponse<AttendanceVerificationResponse>> verifyCorrection(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(attendanceVerificationService.verify(id)));
    }

    // ─── Policy ─────────────────────────────────────────────────────────────────

    @GetMapping("/attendance/policy")
    public ResponseEntity<ApiResponse<AttendancePolicyResponse>> getPolicy(
            @RequestParam(required = false) Long batchId) {
        return ResponseEntity.ok(ApiResponse.of(attendancePolicyService.getEffectivePolicyResponse(batchId)));
    }

    @PutMapping("/attendance/policy")
    public ResponseEntity<ApiResponse<AttendancePolicyResponse>> upsertPolicy(@Valid @RequestBody AttendancePolicyRequest request) {
        AttendancePolicyResponse response = attendancePolicyService.upsertPolicy(request);
        return ResponseEntity.ok(ApiResponse.of("Policy saved", response));
    }

    // ─── Audit Logs ─────────────────────────────────────────────────────────────

    @GetMapping("/attendance/audit-logs")
    public ResponseEntity<ApiResponse<List<com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long classId) {
        List<com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse> logs = attendanceService.getAuditLogs(studentId, classId);
        return ResponseEntity.ok(ApiResponse.of(logs));
    }

    @GetMapping("/attendance/student/{studentId}/audit-logs")
    public ResponseEntity<ApiResponse<List<com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse>>> getStudentAuditLogs(@PathVariable Long studentId) {
        List<com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse> logs = attendanceService.getStudentAuditLogs(studentId);
        return ResponseEntity.ok(ApiResponse.of(logs));
    }
}
