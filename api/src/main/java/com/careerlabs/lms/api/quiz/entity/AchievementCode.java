package com.careerlabs.lms.api.quiz.entity;

/**
 * Fixed catalog of unlockable achievements. There's no admin UI to manage these —
 * the set is small and stable enough to live as code, not a database table.
 */
public enum AchievementCode {
    FIRST_QUIZ("First Steps", "Complete your first quiz", 25),
    PERFECT_SCORE("Perfectionist", "Score 100% on any quiz", 50),
    SEVEN_DAY_STREAK("On Fire", "Maintain a 7-day activity streak", 75),
    HUNDRED_QUESTIONS("Century Club", "Answer 100 questions across all quizzes", 100),
    SPEED_MASTER("Speed Master", "Score 80%+ in under half the allotted time", 40),
    TOP_TEN("Top 10", "Reach the top 10 on the global leaderboard", 60),
    MOST_IMPROVED("Most Improved", "Improve your score by 30+ points on a retake", 50),
    QUIZ_MASTER("Quiz Master", "Complete 10 quizzes", 100);

    private final String displayName;
    private final String description;
    private final int xpReward;

    AchievementCode(String displayName, String description, int xpReward) {
        this.displayName = displayName;
        this.description = description;
        this.xpReward = xpReward;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public int getXpReward() {
        return xpReward;
    }
}
