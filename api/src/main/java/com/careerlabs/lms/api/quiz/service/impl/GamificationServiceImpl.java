package com.careerlabs.lms.api.quiz.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.careerlabs.lms.api.quiz.entity.AchievementCode;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.StudentAchievement;
import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.StudentAchievementRepository;
import com.careerlabs.lms.api.quiz.repository.StudentGameStatsRepository;
import com.careerlabs.lms.api.quiz.service.GamificationService;

@Service
public class GamificationServiceImpl implements GamificationService {

    private final StudentGameStatsRepository studentGameStatsRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionAttemptRepository questionAttemptRepository;

    public GamificationServiceImpl(StudentGameStatsRepository studentGameStatsRepository,
                                    StudentAchievementRepository studentAchievementRepository,
                                    QuizAttemptRepository quizAttemptRepository,
                                    QuestionAttemptRepository questionAttemptRepository) {
        this.studentGameStatsRepository = studentGameStatsRepository;
        this.studentAchievementRepository = studentAchievementRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionAttemptRepository = questionAttemptRepository;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public StudentGameStats getOrCreateStats(Long studentId) {
        return studentGameStatsRepository.findByStudentId(studentId).orElseGet(() -> {
            StudentGameStats stats = new StudentGameStats();
            stats.setStudentId(studentId);
            return studentGameStatsRepository.save(stats);
        });
    }

    @Override
    @Transactional
    public void processSubmission(Long studentId, QuizAttempt attempt) {
        StudentGameStats stats = getOrCreateStats(studentId);
        stats.setTotalXp(stats.getTotalXp() + xpFor(attempt));
        updateStreak(stats);

        List<AchievementCode> newlyUnlocked = determineNewUnlocks(studentId, attempt, stats);
        for (AchievementCode code : newlyUnlocked) {
            stats.setTotalXp(stats.getTotalXp() + code.getXpReward());
        }
        studentGameStatsRepository.save(stats);

        for (AchievementCode code : newlyUnlocked) {
            StudentAchievement achievement = new StudentAchievement();
            achievement.setStudentId(studentId);
            achievement.setCode(code);
            studentAchievementRepository.save(achievement);
        }
    }

    private int xpFor(QuizAttempt attempt) {
        boolean passed = Boolean.TRUE.equals(attempt.getPassed());
        int correctCount = attempt.getCorrectCount();
        return (correctCount * 10) + (passed ? 50 : 0);
    }

    private void updateStreak(StudentGameStats stats) {
        LocalDate today = LocalDate.now();
        LocalDate last = stats.getLastActivityDate();

        if (last == null || last.equals(today.minusDays(1))) {
            stats.setCurrentStreak(stats.getCurrentStreak() + 1);
        } else if (!last.equals(today)) {
            stats.setCurrentStreak(1);
        }
        // if last == today, the student already has activity today — streak unchanged

        stats.setLastActivityDate(today);
        stats.setLongestStreak(Math.max(stats.getLongestStreak(), stats.getCurrentStreak()));
    }

    private List<AchievementCode> determineNewUnlocks(Long studentId, QuizAttempt attempt, StudentGameStats stats) {
        List<AchievementCode> unlocked = new ArrayList<>();
        long submittedCount = quizAttemptRepository.countByStudentIdAndStatus(studentId, AttemptStatus.SUBMITTED);

        considerUnlock(unlocked, studentId, AchievementCode.FIRST_QUIZ, submittedCount == 1);

        boolean perfect = attempt.getTotalScore() != null && attempt.getTotalScore() > 0
                && attempt.getScore() != null && attempt.getScore().intValue() == attempt.getTotalScore();
        considerUnlock(unlocked, studentId, AchievementCode.PERFECT_SCORE, perfect);

        considerUnlock(unlocked, studentId, AchievementCode.SEVEN_DAY_STREAK, stats.getCurrentStreak() >= 7);

        long questionsAnswered = questionAttemptRepository.findAllSubmittedByStudentId(studentId).stream()
                .filter(qa -> !qa.getSelectedOptions().isEmpty())
                .count();
        considerUnlock(unlocked, studentId, AchievementCode.HUNDRED_QUESTIONS, questionsAnswered >= 100);

        considerUnlock(unlocked, studentId, AchievementCode.QUIZ_MASTER, submittedCount >= 10);

        boolean speedMaster = attempt.getTimeTaken() != null && attempt.getQuiz().getDuration() != null
                && attempt.getTimeTaken() <= (attempt.getQuiz().getDuration() * 60) / 2.0
                && scorePercentage(attempt) >= 80;
        considerUnlock(unlocked, studentId, AchievementCode.SPEED_MASTER, speedMaster);

        long betterThanMe = studentGameStatsRepository.findAll().stream()
                .filter(s -> !s.getStudentId().equals(studentId))
                .filter(s -> s.getTotalXp() > stats.getTotalXp())
                .count();
        considerUnlock(unlocked, studentId, AchievementCode.TOP_TEN, betterThanMe < 10);

        List<QuizAttempt> sameQuizSubmitted = quizAttemptRepository
                .findByQuizIdAndStudentIdOrderByAttemptNumberDesc(attempt.getQuiz().getId(), studentId).stream()
                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED)
                .sorted(Comparator.comparingInt(QuizAttempt::getAttemptNumber))
                .toList();
        if (sameQuizSubmitted.size() >= 2) {
            double firstPct = scorePercentage(sameQuizSubmitted.get(0));
            double latestPct = scorePercentage(sameQuizSubmitted.get(sameQuizSubmitted.size() - 1));
            considerUnlock(unlocked, studentId, AchievementCode.MOST_IMPROVED, (latestPct - firstPct) >= 30);
        }

        return unlocked;
    }

    private double scorePercentage(QuizAttempt attempt) {
        if (attempt.getTotalScore() == null || attempt.getTotalScore() == 0 || attempt.getScore() == null) {
            return 0;
        }
        return (attempt.getScore() * 100.0) / attempt.getTotalScore();
    }

    private void considerUnlock(List<AchievementCode> unlocked, Long studentId, AchievementCode code, boolean condition) {
        if (condition && !studentAchievementRepository.existsByStudentIdAndCode(studentId, code)) {
            unlocked.add(code);
        }
    }
}
