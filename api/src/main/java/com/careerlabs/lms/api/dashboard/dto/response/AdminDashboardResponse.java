package com.careerlabs.lms.api.dashboard.dto.response;

import com.careerlabs.lms.api.report.dto.response.PerformanceReportResponse;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record AdminDashboardResponse(
                Overview overview,
                Performance performance,
                Attendance attendance,
                Assignments assignments,
                Quizzes quizzes,
                Drafts drafts,
                Placement placement,
                List<UpcomingSession> upcomingSessions,
                List<ActivityItem> recentActivity) {

        public record Overview(
                        long totalStudents,
                        long activeStudents,
                        long totalTrainers,
                        long activeTrainers,
                        long totalBatches,
                        long activeBatches,
                        long totalCourses,
                        long totalAssignments,
                        long totalQuizzes,
                        long placementDrives) {
        }

        public record Performance(
                        Double averagePerformancePct,
                        List<PerformanceReportResponse.TrendPoint> trend,
                        long atRiskCount,
                        long needsImprovementCount) {
        }

        public record Attendance(
                        int healthy,
                        int atRisk,
                        int critical,
                        int overallPct) {
        }

        public record Assignments(
                        long published,
                        long pendingSubmissions,
                        long lateSubmissions,
                        long graded,
                        long draft) {
        }

        public record Quizzes(
                        long total,
                        long attempts,
                        Double avgScore,
                        Double passRate,
                        long draft) {
        }

        public record Drafts(
                        long assignments,
                        long courses,
                        long quizzes,
                        long recordedSessions,
                        long announcements) {
        }

        public record Placement(
                        long activeDrives,
                        long interestedStudents,
                        long availableDrives) {
        }

        public record UpcomingSession(
                        Long classId,
                        String batchName,
                        String title,
                        LocalDateTime date,
                        String meetLink,
                        String status) {
        }

        /** type: NEW_STUDENT | SUBMISSION | QUIZ_ATTEMPT. */
        public record ActivityItem(
                        String type,
                        String label,
                        Instant time

        ) {
        }
}
