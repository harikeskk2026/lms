package com.careerlabs.lms.api.attendance.service;

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
import com.careerlabs.lms.api.attendance.dto.StudentAttendanceSummaryResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCalendarDayResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceHistoryPageResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceRecordResponse;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.security.JwtUserPrincipal;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface AttendanceService {

    List<DailyClassResponse> getClasses(Long batchId, String date, ClassStatus status, JwtUserPrincipal principal);

    DailyClassResponse createClass(DailyClassRequest request, JwtUserPrincipal principal);

    DailyClassResponse updateClass(Long classId, DailyClassRequest request, JwtUserPrincipal principal);

    void deleteClass(Long classId, JwtUserPrincipal principal);

    List<AttendanceSheetItemResponse> getAttendanceSheet(Long classId, JwtUserPrincipal principal);

    List<AttendanceSheetItemResponse> markAttendance(Long classId, List<AttendanceRecordRequest> records);

    List<AttendanceSheetItemResponse> markAttendance(Long classId, List<AttendanceRecordRequest> records, boolean submit);

    List<AttendanceSheetItemResponse> markAttendance(Long classId, List<AttendanceRecordRequest> records, boolean submit, Long markerUserId);

    List<AttendanceSheetItemResponse> getPreviousAttendanceSheet(Long classId, JwtUserPrincipal principal);

    AttendanceRecordResponse editAttendanceRecord(Long attendanceId, Long reviewerUserId, AttendStatus status, String remarks);

    List<AttendanceCalendarDayResponse> getCalendarDay(Long userId, LocalDate date);

    List<AttendanceOverviewItemResponse> getAttendanceOverview();

    AttendanceAnalyticsResponse getAttendanceAnalytics(Long batchId, Integer days);

    List<LowAttendanceStudentResponse> getLowAttendanceStudents(Double threshold, Long batchId);

    AttendanceHistoryResponse getStudentAttendanceHistory(Long studentIdOrUserId);

    BatchAttendanceMatrixResponse getBatchAttendanceDetail(Long batchId, String month);

    List<AttendanceAlertResponse> getAttendanceAlerts(Boolean resolved, Long batchId);

    Map<String, Object> generateAttendanceAlerts(Double threshold);

    AttendanceAlertResponse resolveAlert(Long alertId);

    StudentAttendanceSummaryResponse getStudentAttendanceSummary(Long userId);

    StudentAttendanceSummaryResponse getStudentAttendanceSummary(Long userId, String month);

    List<AttendanceAnalyticsResponse.DailyTrendPoint> getStudentAttendanceTrend(Long userId);

    List<AttendanceHistoryResponse.RecentRecordDto> getStudentAttendanceRecords(Long userId, String month);

    AttendanceHistoryPageResponse getAttendanceHistory(
            LocalDate from, LocalDate to, Long batchId, Long courseId, Long classId, Long studentId,
            AttendStatus status, String search, int page, int limit);

    List<com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse> getStudentAuditLogs(Long studentIdOrUserId);

    List<com.careerlabs.lms.api.attendance.dto.AttendanceAuditLogResponse> getAuditLogs(Long studentId, Long classId);

    void ensurePastClassesMarkedForUser(Long userId);
}
