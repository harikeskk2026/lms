package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.repository.StudentGameStatsRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Seeds a handful of demo students with real, submitted {@link QuizAttempt}s (spread
 * across the last couple of weeks, one student with two attempts on the same quiz)
 * against the quiz created by {@link DevQuizSeeder}, so the Global/Weekly/Monthly/Most
 * Improved leaderboard views have real, differentiated rankings to show instead of a
 * single student. Controlled by the same APP_SEED_ENABLED flag; only runs once (skips
 * if the first demo student already exists) and only after a quiz exists to attach to.
 */
@Component
@Order(3)
public class DevLeaderboardSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevLeaderboardSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionAttemptRepository questionAttemptRepository;
    private final StudentGameStatsRepository studentGameStatsRepository;
    private final boolean seedEnabled;

    private record Profile(String name, String email, int[] correctCounts, int[] daysAgo) {
    }

    public DevLeaderboardSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder,
                                 QuizRepository quizRepository, QuizQuestionRepository quizQuestionRepository,
                                 QuizAttemptRepository quizAttemptRepository,
                                 QuestionAttemptRepository questionAttemptRepository,
                                 StudentGameStatsRepository studentGameStatsRepository,
                                 @Value("${app.seed.enabled}") boolean seedEnabled) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.studentGameStatsRepository = studentGameStatsRepository;
        this.seedEnabled = seedEnabled;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled || userRepository.existsByEmailIgnoreCase("aisha.khan@careerlabs.com")) {
            return;
        }

        Optional<Quiz> quizOpt = quizRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(q -> "Java Backend Assessment".equals(q.getTitle()))
                .findFirst();
        if (quizOpt.isEmpty()) {
            return;
        }
        Quiz quiz = quizOpt.get();

        List<Question> questions = quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).stream()
                .map(QuizQuestion::getQuestion)
                .toList();
        if (questions.isEmpty()) {
            return;
        }

        List<Profile> profiles = List.of(
                new Profile("Aisha Khan", "aisha.khan@careerlabs.com", new int[]{5}, new int[]{2}),
                new Profile("Rohan Mehta", "rohan.mehta@careerlabs.com", new int[]{4}, new int[]{3}),
                new Profile("Priya Sharma", "priya.sharma@careerlabs.com", new int[]{3}, new int[]{1}),
                new Profile("Karthik Iyer", "karthik.iyer@careerlabs.com", new int[]{2}, new int[]{5}),
                new Profile("Sneha Patel", "sneha.patel@careerlabs.com", new int[]{1, 5}, new int[]{9, 2}),
                new Profile("Vikram Nair", "vikram.nair@careerlabs.com", new int[]{3}, new int[]{6})
        );

        for (Profile profile : profiles) {
            User student = createStudent(profile.name(), profile.email());

            int totalXp = 0;
            LocalDate lastActivity = null;
            int longestStreak = 1;

            for (int i = 0; i < profile.correctCounts().length; i++) {
                QuizAttempt attempt = seedAttempt(quiz, questions, student.getId(), i + 1,
                        profile.correctCounts()[i], profile.daysAgo()[i]);
                boolean passed = Boolean.TRUE.equals(attempt.getPassed());
                totalXp += attempt.getCorrectCount() * 10 + (passed ? 50 : 0);

                LocalDate activityDate = LocalDate.now().minusDays(profile.daysAgo()[i]);
                if (lastActivity == null || activityDate.isAfter(lastActivity)) {
                    lastActivity = activityDate;
                }
            }

            if (profile.correctCounts().length > 1) {
                longestStreak = 2;
            }

            StudentGameStats stats = new StudentGameStats();
            stats.setStudentId(student.getId());
            stats.setTotalXp(totalXp);
            stats.setCurrentStreak(1);
            stats.setLongestStreak(longestStreak);
            stats.setLastActivityDate(lastActivity);
            studentGameStatsRepository.save(stats);
        }

        log.info("Seeded {} demo students with quiz attempts and XP for the leaderboard", profiles.size());
    }

    private User createStudent(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
        user.setRole(Role.STUDENT);
        user.setActive(true);
        return userRepository.save(user);
    }

    private QuizAttempt seedAttempt(Quiz quiz, List<Question> questions, Long studentId, int attemptNumber,
                                     int correctCount, int daysAgo) {
        Instant completedAt = Instant.now().minus(daysAgo, ChronoUnit.DAYS);
        Instant startedAt = completedAt.minus(Math.max(5, quiz.getDuration() / 2), ChronoUnit.MINUTES);

        int totalScore = questions.stream().mapToInt(Question::getPoints).sum();

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setStudentId(studentId);
        attempt.setAttemptNumber(attemptNumber);
        attempt.setStartedAt(startedAt);
        attempt.setTotalScore(totalScore);
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt = quizAttemptRepository.save(attempt);

        int score = 0;
        int correct = 0;
        for (int i = 0; i < questions.size(); i++) {
            Question question = questions.get(i);
            boolean isCorrect = i < correctCount;

            QuestionAttempt qa = new QuestionAttempt();
            qa.setAttempt(attempt);
            qa.setQuestion(question);
            qa.setOrderIndex(i);
            qa.setTopicId(question.getTopic() != null ? question.getTopic().getId() : null);
            qa.setDifficulty(question.getDifficulty());
            qa.setTimeTaken(30 + i * 5);

            List<QuestionOption> selected = new ArrayList<>();
            if (isCorrect) {
                question.getOptions().stream().filter(QuestionOption::isCorrect).forEach(selected::add);
                qa.setPointsEarned(question.getPoints());
                score += question.getPoints();
                correct++;
            } else {
                question.getOptions().stream().filter(o -> !o.isCorrect()).findFirst().ifPresent(selected::add);
                qa.setPointsEarned(0);
            }
            qa.setSelectedOptions(selected);
            qa.setCorrect(isCorrect);
            questionAttemptRepository.save(qa);
        }

        int wrong = questions.size() - correct;
        double accuracy = (correct * 100.0) / questions.size();
        boolean passed = totalScore > 0 && quiz.getPassingScore() != null
                && (score * 100.0 / totalScore) >= quiz.getPassingScore();

        attempt.setScore(score);
        attempt.setCorrectCount(correct);
        attempt.setWrongCount(wrong);
        attempt.setSkippedCount(0);
        attempt.setAccuracy(accuracy);
        attempt.setCompletedAt(completedAt);
        attempt.setTimeTaken((int) Duration.between(startedAt, completedAt).getSeconds());
        attempt.setPassed(passed);
        return quizAttemptRepository.save(attempt);
    }
}
