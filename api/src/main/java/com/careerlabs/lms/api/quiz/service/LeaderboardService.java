package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.LeaderboardResponse;

public interface LeaderboardService {

    /** type: GLOBAL (default), WEEKLY, MONTHLY, or MOST_IMPROVED. */
    LeaderboardResponse getLeaderboard(String type, Long studentId);
}
