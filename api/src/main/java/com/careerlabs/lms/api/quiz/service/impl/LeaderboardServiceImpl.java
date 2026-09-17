package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.quiz.dto.response.LeaderboardResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.StudentGameStatsRepository;
import com.careerlabs.lms.api.quiz.service.LeaderboardService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LeaderboardServiceImpl implements LeaderboardService {

    private final StudentGameStatsRepository studentGameStatsRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public LeaderboardServiceImpl(StudentGameStatsRepository studentGameStatsRepository,
                                   QuizAttemptRepository quizAttemptRepository, UserRepository userRepository,
                                   StudentRepository studentRepository, EnrollmentRepository enrollmentRepository) {
        this.studentGameStatsRepository = studentGameStatsRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(String type, Long studentId) {
        String normalized = type == null || type.isBlank() ? "GLOBAL" : type.toUpperCase();
        Set<Long> peerUserIds = resolvePeerUserIds(studentId);

        List<Map.Entry<Long, Double>> ranked = switch (normalized) {
            case "WEEKLY" -> xpSince(Instant.now().minus(7, ChronoUnit.DAYS), peerUserIds);
            case "MONTHLY" -> xpSince(Instant.now().minus(30, ChronoUnit.DAYS), peerUserIds);
            case "MOST_IMPROVED" -> mostImproved(peerUserIds);
            default -> globalXp(peerUserIds);
        };

        List<LeaderboardResponse.Entry> entries = toEntries(ranked);
        LeaderboardResponse.Entry mine = entries.stream()
                .filter(e -> e.studentId().equals(studentId))
                .findFirst()
                .orElse(null);

        return new LeaderboardResponse(normalized, entries, mine);
    }

    /**
     * User ids of students who share at least one active batch (or, absent a batch
     * assignment, course) enrollment with the caller, so the leaderboard only ranks
     * the caller against their own cohort instead of every student in the system.
     * Falls back to just the caller when they have no student profile or no active
     * enrollment, rather than silently widening back out to everyone.
     */
    private Set<Long> resolvePeerUserIds(Long callerUserId) {
        Optional<Student> callerOpt = studentRepository.findByUserId(callerUserId);
        if (callerOpt.isEmpty()) {
            return Set.of(callerUserId);
        }
        Long callerStudentId = callerOpt.get().getId();
        List<Enrollment> activeEnrollments =
                enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(callerStudentId);
        if (activeEnrollments.isEmpty()) {
            return Set.of(callerUserId);
        }

        Set<Long> peerStudentIds = new HashSet<>();
        for (Enrollment enrollment : activeEnrollments) {
            if (enrollment.getBatch() != null) {
                peerStudentIds.addAll(enrollmentRepository.findActiveStudentIdsByBatchId(enrollment.getBatch().getId()));
            } else {
                peerStudentIds.addAll(enrollmentRepository.findActiveStudentIdsByCourseId(enrollment.getCourse().getId()));
            }
        }
        peerStudentIds.add(callerStudentId);

        return studentRepository.findAllById(peerStudentIds).stream()
                .map(s -> s.getUser().getId())
                .collect(Collectors.toSet());
    }

    private List<Map.Entry<Long, Double>> globalXp(Set<Long> peerUserIds) {
        return studentGameStatsRepository.findByStudentIdIn(peerUserIds).stream()
                .filter(s -> s.getTotalXp() > 0)
                .sorted(Comparator.comparingInt(StudentGameStats::getTotalXp).reversed())
                .map(s -> Map.entry(s.getStudentId(), (double) s.getTotalXp()))
                .toList();
    }

    private List<Map.Entry<Long, Double>> xpSince(Instant since, Set<Long> peerUserIds) {
        Map<Long, Double> xpByStudent = new HashMap<>();
        for (QuizAttempt attempt : quizAttemptRepository.findAllSubmittedSince(since)) {
            if (!peerUserIds.contains(attempt.getStudentId())) {
                continue;
            }
            double xp = xpFor(attempt);
            if (xp > 0) {
                xpByStudent.merge(attempt.getStudentId(), xp, Double::sum);
            }
        }
        return xpByStudent.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .toList();
    }

    private List<Map.Entry<Long, Double>> mostImproved(Set<Long> peerUserIds) {
        Map<Long, Map<Long, List<QuizAttempt>>> byStudentThenQuiz = quizAttemptRepository.findAll().stream()
                .filter(a -> a.getStatus() == AttemptStatus.SUBMITTED && peerUserIds.contains(a.getStudentId()))
                .collect(Collectors.groupingBy(QuizAttempt::getStudentId,
                        Collectors.groupingBy(a -> a.getQuiz().getId())));

        Map<Long, Double> bestImprovement = new HashMap<>();
        for (Map.Entry<Long, Map<Long, List<QuizAttempt>>> studentEntry : byStudentThenQuiz.entrySet()) {
            double best = 0;
            for (List<QuizAttempt> attempts : studentEntry.getValue().values()) {
                if (attempts.size() < 2) {
                    continue;
                }
                List<QuizAttempt> ordered = attempts.stream()
                        .sorted(Comparator.comparingInt(QuizAttempt::getAttemptNumber))
                        .toList();
                double improvement = scorePercentage(ordered.get(ordered.size() - 1)) - scorePercentage(ordered.get(0));
                best = Math.max(best, improvement);
            }
            if (best > 0) {
                bestImprovement.put(studentEntry.getKey(), best);
            }
        }
        return bestImprovement.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .toList();
    }

    private List<LeaderboardResponse.Entry> toEntries(List<Map.Entry<Long, Double>> ranked) {
        if (ranked.isEmpty()) {
            return List.of();
        }
        List<Long> ids = ranked.stream().map(Map.Entry::getKey).toList();
        Map<Long, String> names = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        List<LeaderboardResponse.Entry> entries = new ArrayList<>();
        int rank = 1;
        for (Map.Entry<Long, Double> row : ranked) {
            entries.add(new LeaderboardResponse.Entry(rank++, row.getKey(),
                    names.getOrDefault(row.getKey(), "Student"), round1(row.getValue())));
        }
        return entries;
    }

    private static final int COMPLETION_XP = 10;

    /** Mirrors {@code GamificationServiceImpl.xpFor} so WEEKLY/MONTHLY rankings
     * (recomputed from attempts here) agree with the totalXp stored per-student. */
    private int xpFor(QuizAttempt attempt) {
        return COMPLETION_XP + performanceXp(scorePercentage(attempt));
    }

    private int performanceXp(double scorePercentage) {
        if (scorePercentage >= 90) return 20;
        if (scorePercentage >= 75) return 15;
        if (scorePercentage >= 60) return 10;
        if (scorePercentage >= 40) return 5;
        return 0;
    }

    private double scorePercentage(QuizAttempt attempt) {
        if (attempt.getTotalScore() == null || attempt.getTotalScore() == 0 || attempt.getScore() == null) {
            return 0;
        }
        return (attempt.getScore() * 100.0) / attempt.getTotalScore();
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
