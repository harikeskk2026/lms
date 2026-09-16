package com.careerlabs.lms.api.dashboard.dto.response;

import com.careerlabs.lms.api.assignment.dto.response.StudentAssignmentResponse;
import com.careerlabs.lms.api.quiz.dto.response.AchievementResponse;
import com.careerlabs.lms.api.quiz.dto.response.DailyChallengeResponse;
import com.careerlabs.lms.api.quiz.dto.response.LeaderboardResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.WeakAreaResponse;
import com.careerlabs.lms.api.report.dto.response.ReportStudentResponse;

import java.time.LocalDateTime;
import java.util.List;

public record StudentDashboardResponse(
        Overview overview,
        List<ContinueLearningItem> continueLearning,
        TodaysTasks todaysTasks,
        Performance performance,
        Attendance attendance,
        Gamification gamification,
        Placement placement,
        List<UpcomingClass> upcomingClasses
) {

    public record Overview(
            long myCourses,
            Double assignmentCompletionPct,
            int attendancePct,
            long pendingAssignments,
            Double quizScorePct,
            int xp,
            int streak
    ) {
    }

    /**
     * Resume point derived purely from module/topic/session ordering - there is no
     * completion-tracking entity anywhere in the backend, so this is NOT a progress
     * percentage, just "here's where you'd pick back up".
     */
    public record ContinueLearningItem(
            Long courseId,
            String courseTitle,
            String moduleTitle,
            String topicTitle,
            String sessionTitle,
            Long sessionId
    ) {
    }

    public record TodaysTasks(
            List<StudentAssignmentResponse> pendingAssignments,
            List<StudentQuizResponse> availableQuizzes,
            List<UpcomingClass> upcomingSessions
    ) {
    }

    public record Performance(
            QuizAnalyticsResponse quiz,
            ReportStudentResponse assignment
    ) {
    }

    public record Attendance(
            int currentPercentage,
            int previousPercentage,
            int improvement,
            String riskLevel
    ) {
    }

    public record Gamification(
            int xp,
            int currentStreak,
            int longestStreak,
            List<AchievementResponse> achievements,
            DailyChallengeResponse dailyChallenge,
            LeaderboardResponse leaderboard,
            List<WeakAreaResponse> weakAreas
    ) {
    }

    public record Placement(
            String status,
            long availableDrives,
            long interestExpressed
    ) {
    }

    public record UpcomingClass(
            Long classId,
            String batchName,
            String title,
            LocalDateTime date,
            String meetLink,
            String status,
            LocalDateTime scheduledEnd,
            String courseTitle
    ) {
        public UpcomingClass(Long classId, String batchName, String title, LocalDateTime date, String meetLink) {
            this(classId, batchName, title, date, meetLink, "UPCOMING", null, null);
        }
    }
}
