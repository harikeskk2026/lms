package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

public record AttendanceReportResponse(
        boolean available,
        String message,
        ReportSummaryResponse summary,
        List<TrendPoint> attendanceTrend,
        List<BatchAttendance> attendanceByBatch,
        List<StatusCount> attendanceDistribution,
        List<ReportStudentResponse> students,
        int totalClasses,
        int lowAttendanceCount
) {

    public record TrendPoint(String period, Double percentage) {
    }

    public record BatchAttendance(Long batchId, String batchName, Double percentage) {
    }

    public record StatusCount(String status, long count) {
    }
}
