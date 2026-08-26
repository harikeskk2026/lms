package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

/**
 * available is always false today — there is no attendance data model in this backend yet.
 * The shape is kept real (not omitted) so the frontend has a stable, chart-ready contract to
 * code against once attendance tracking is added; every list stays empty until then.
 */
public record AttendanceReportResponse(
        boolean available,
        String message,
        ReportSummaryResponse summary,
        List<TrendPoint> attendanceTrend,
        List<BatchAttendance> attendanceByBatch,
        List<StatusCount> attendanceDistribution,
        List<ReportStudentResponse> students
) {

    public record TrendPoint(String period, Double percentage) {
    }

    public record BatchAttendance(Long batchId, String batchName, Double percentage) {
    }

    public record StatusCount(String status, long count) {
    }
}
