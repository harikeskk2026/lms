package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record AttendanceHistoryResponse(
        StudentInfoDto student,
        int overallPct,
        int totalPresent,
        int totalAbsent,
        int totalLate,
        int totalAll,
        int streak,
        List<BatchAttendanceHistoryDto> batches,
        List<MonthlyBreakdownDto> monthly,
        List<RecentRecordDto> recentRecords
) {
    public record StudentInfoDto(
            Long id,
            Long userId,
            String name,
            String email,
            String enrollmentNo
    ) {}

    public record BatchAttendanceHistoryDto(
            Long batchId,
            String batchName,
            String course,
            int present,
            int absent,
            int late,
            int excused,
            int total,
            int percentage,
            List<ClassRecordDto> records
    ) {}

    public record ClassRecordDto(
            Long classId,
            LocalDateTime date,
            String classTitle,
            AttendStatus status,
            Instant markedAt
    ) {}

    public record MonthlyBreakdownDto(
            String month,
            int present,
            int absent,
            int late,
            int total
    ) {}

    public record RecentRecordDto(
            LocalDateTime date,
            String classTitle,
            String batchName,
            AttendStatus status,
            Instant markedAt
    ) {}
}
