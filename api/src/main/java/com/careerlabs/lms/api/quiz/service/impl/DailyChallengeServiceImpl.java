package com.careerlabs.lms.api.quiz.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.quiz.dto.response.DailyChallengeResponse;
import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.DailyChallenge;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.repository.DailyChallengeRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.DailyChallengeService;
import com.careerlabs.lms.api.quiz.service.QuizAttemptService;

@Service
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private static final int QUESTION_COUNT = 10;
    private static final int DURATION_MINUTES = 10;

    private final DailyChallengeRepository dailyChallengeRepository;
    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptService quizAttemptService;

    public DailyChallengeServiceImpl(DailyChallengeRepository dailyChallengeRepository,
                                      QuestionRepository questionRepository, QuizRepository quizRepository,
                                      QuizQuestionRepository quizQuestionRepository,
                                      QuizAttemptRepository quizAttemptRepository,
                                      QuizAttemptService quizAttemptService) {
        this.dailyChallengeRepository = dailyChallengeRepository;
        this.questionRepository = questionRepository;
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAttemptService = quizAttemptService;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public DailyChallengeResponse getToday(Long studentId) {
        DailyChallenge challenge = getOrCreateToday();
        if (challenge == null) {
            return null;
        }
        Quiz quiz = challenge.getQuiz();
        int totalQuestions = (int) quizQuestionRepository.countByQuizId(quiz.getId());
        boolean attempted = quizAttemptRepository
                .countByQuizIdAndStudentIdAndStatus(quiz.getId(), studentId, AttemptStatus.SUBMITTED) > 0;
        Integer rank = attempted ? computeRank(quiz.getId(), studentId) : null;

        return new DailyChallengeResponse(quiz.getId(), quiz.getTitle(), quiz.getDuration(), quiz.getPassingScore(),
                totalQuestions, attempted, rank);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public StartAttemptResponse start(Long studentId) {
        DailyChallenge challenge = getOrCreateToday();
        if (challenge == null) {
            throw new ConflictException("No active questions available for today's challenge yet");
        }
        return quizAttemptService.start(challenge.getQuiz().getId(), studentId);
    }

    private DailyChallenge getOrCreateToday() {
        LocalDate today = LocalDate.now();
        return dailyChallengeRepository.findByChallengeDate(today).orElseGet(() -> createChallenge(today));
    }

    private DailyChallenge createChallenge(LocalDate date) {
        List<Question> pool = new ArrayList<>(questionRepository.findAll().stream()
                .filter(Question::isActive)
                .toList());
        if (pool.isEmpty()) {
            return null;
        }
        Collections.shuffle(pool);
        List<Question> selected = pool.stream().limit(QUESTION_COUNT).toList();

        Quiz quiz = new Quiz();
        quiz.setTitle("Daily Challenge — " + date);
        quiz.setDescription("Today's daily challenge. One attempt only, XP and streak on the line.");
        quiz.setType(QuizType.MCQ);
        quiz.setDifficulty(QuizDifficulty.MEDIUM);
        quiz.setDuration(DURATION_MINUTES);
        quiz.setPassingScore(60);
        quiz.setMaxAttempts(1);
        quiz.setRandomQuestions(true);
        quiz.setRandomOptions(true);
        quiz.setShowExplanation(true);
        quiz.setStatus(QuizStatus.PUBLISHED);
        quiz = quizRepository.save(quiz);

        int order = 0;
        for (Question question : selected) {
            QuizQuestion quizQuestion = new QuizQuestion();
            quizQuestion.setQuiz(quiz);
            quizQuestion.setQuestion(question);
            quizQuestion.setOrderIndex(order++);
            quizQuestionRepository.save(quizQuestion);
        }

        DailyChallenge challenge = new DailyChallenge();
        challenge.setChallengeDate(date);
        challenge.setQuiz(quiz);
        return dailyChallengeRepository.save(challenge);
    }

    private Integer computeRank(Long quizId, Long studentId) {
        List<QuizAttempt> ranked = quizAttemptRepository
                .findByQuizIdAndStatusOrderByScoreDescTimeTakenAsc(quizId, AttemptStatus.SUBMITTED);
        for (int i = 0; i < ranked.size(); i++) {
            if (ranked.get(i).getStudentId().equals(studentId)) {
                return i + 1;
            }
        }
        return null;
    }
}
