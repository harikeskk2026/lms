package com.careerlabs.lms.api.dashboard.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record TrainerDashboardResponse(
        Overview overview,
        List<TodayScheduleItem> todaySchedule,
        List<TrainerBatchItem> myBatches,
        List<PendingGradingItem> pendingGrading,
        AttendanceSummary attendanceSummary
) {

    public record Overview(
            long myBatchesCount,
            long myStudentsCount,
            long todaySessionsCount,
            long pendingGradingCount,
            int attendancePct,
            long myCoursesCount
    ) {
    }

    public record TodayScheduleItem(
            Long sessionOrClassId,
            String time,
            String courseName,
            String batchName,
            String status,
            String meetLink
    ) {
    }

    public record TrainerBatchItem(
            Long batchId,
            String batchName,
            String courseName,
            long studentCount,
            int attendancePct,
            int progressPct
    ) {
    }

    public record PendingGradingItem(
            Long submissionId,
            Long assignmentId,
            String assignmentTitle,
            String studentName,
            String batchName,
            String submittedAt
    ) {
    }

    public record AttendanceSummary(
            int overallAttendancePct,
            int todayAttendancePct,
            long lowAttendanceStudentsCount
    ) {
    }
}
