package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuestionOptionResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuestionResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizEffectiveStatus;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.AdaptiveQuizService;
import com.careerlabs.lms.api.quiz.service.QuizAvailabilityService;
import com.careerlabs.lms.api.quiz.service.QuizScoringService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdaptiveQuizServiceImpl implements AdaptiveQuizService {

    private static final int SESSION_LENGTH = 5;

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionAttemptRepository questionAttemptRepository;
    private final QuizScoringService quizScoringService;
    private final QuizAvailabilityService quizAvailabilityService;

    public AdaptiveQuizServiceImpl(QuizRepository quizRepository, QuizQuestionRepository quizQuestionRepository,
                                    QuizAttemptRepository quizAttemptRepository,
                                    QuestionAttemptRepository questionAttemptRepository,
                                    QuizScoringService quizScoringService,
                                    QuizAvailabilityService quizAvailabilityService) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.quizScoringService = quizScoringService;
        this.quizAvailabilityService = quizAvailabilityService;
    }

    @Override
    @Transactional
    public StartAttemptResponse start(Long quizId, Long studentId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found: " + quizId));
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new ConflictException("Quiz is not available");
        }
        if (quiz.getType() != QuizType.ADAPTIVE) {
            throw new ConflictException("This quiz is not configured for adaptive mode");
        }

        QuizEffectiveStatus effectiveStatus = quizAvailabilityService.effectiveStatus(quiz);
        if (effectiveStatus == QuizEffectiveStatus.SCHEDULED) {
            throw new ConflictException("This quiz hasn't opened yet");
        }
        if (effectiveStatus == QuizEffectiveStatus.COMPLETED) {
            throw new ConflictException("This quiz has closed");
        }
        if (!quizAvailabilityService.isAssignedTo(quiz, studentId)) {
            throw new ForbiddenException("You are not assigned to this quiz");
        }

        QuizAttempt attempt = quizAttemptRepository
                .findByQuizIdAndStudentIdAndStatus(quizId, studentId, AttemptStatus.IN_PROGRESS)
                .orElseGet(() -> createAttempt(quiz, studentId));

        List<StudentQuestionResponse> questions = questionAttemptRepository
                .findByAttemptIdOrderByOrderIndexAsc(attempt.getId()).stream()
                .map(qa -> toStudentQuestionResponse(qa.getQuestion()))
                .toList();

        return StartAttemptResponse.from(attempt, questions);
    }

    private QuizAttempt createAttempt(Quiz quiz, Long studentId) {
        long submittedCount = quizAttemptRepository
                .countByQuizIdAndStudentIdAndStatus(quiz.getId(), studentId, AttemptStatus.SUBMITTED);
        if (submittedCount >= quiz.getMaxAttempts()) {
            throw new ConflictException("Maximum attempts reached for this quiz");
        }

        Question first = pickQuestion(quiz.getId(), QuizDifficulty.MEDIUM, Set.of());
        if (first == null) {
            throw new ConflictException("No questions available for this adaptive quiz yet");
        }

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setStudentId(studentId);
        attempt.setAttemptNumber((int) submittedCount + 1);
        attempt.setStartedAt(Instant.now());
        attempt.setTotalScore(first.getPoints());
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt = quizAttemptRepository.save(attempt);

        saveQuestionAttempt(attempt, first, 0);
        return attempt;
    }

    @Override
    @Transactional
    public StudentQuestionResponse next(Long attemptId, Long studentId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));
        if (!attempt.getStudentId().equals(studentId)) {
            throw new ForbiddenException("This attempt does not belong to you");
        }
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ConflictException("This attempt has already been submitted");
        }
        if (attempt.getQuiz().getType() != QuizType.ADAPTIVE) {
            throw new ConflictException("This attempt is not an adaptive quiz");
        }

        List<QuestionAttempt> served = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attemptId);
        if (served.isEmpty() || served.size() >= SESSION_LENGTH) {
            return null;
        }

        QuestionAttempt last = served.get(served.size() - 1);
        quizScoringService.score(last);
        questionAttemptRepository.save(last);

        QuizDifficulty nextDifficulty = nextDifficulty(last);
        Set<Long> usedIds = served.stream().map(qa -> qa.getQuestion().getId()).collect(Collectors.toSet());
        Question next = pickQuestion(attempt.getQuiz().getId(), nextDifficulty, usedIds);
        if (next == null) {
            return null;
        }

        saveQuestionAttempt(attempt, next, served.size());
        attempt.setTotalScore((attempt.getTotalScore() == null ? 0 : attempt.getTotalScore()) + next.getPoints());
        quizAttemptRepository.save(attempt);

        return toStudentQuestionResponse(next);
    }

    private QuizDifficulty nextDifficulty(QuestionAttempt last) {
        QuizDifficulty current = last.getDifficulty() == null ? QuizDifficulty.MEDIUM : last.getDifficulty();
        boolean correct = Boolean.TRUE.equals(last.getCorrect());
        if (correct) {
            return switch (current) {
                case EASY -> QuizDifficulty.MEDIUM;
                case MEDIUM, HARD -> QuizDifficulty.HARD;
            };
        }
        return switch (current) {
            case HARD -> QuizDifficulty.MEDIUM;
            case MEDIUM, EASY -> QuizDifficulty.EASY;
        };
    }

    private Question pickQuestion(Long quizId, QuizDifficulty preferredDifficulty, Set<Long> excludeIds) {
        List<Question> pool = quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).stream()
                .map(QuizQuestion::getQuestion)
                .filter(q -> !excludeIds.contains(q.getId()))
                .toList();
        if (pool.isEmpty()) {
            return null;
        }
        List<Question> atDifficulty = pool.stream().filter(q -> q.getDifficulty() == preferredDifficulty).toList();
        List<Question> candidates = atDifficulty.isEmpty() ? pool : atDifficulty;
        return candidates.get(new Random().nextInt(candidates.size()));
    }

    private void saveQuestionAttempt(QuizAttempt attempt, Question question, int orderIndex) {
        QuestionAttempt qa = new QuestionAttempt();
        qa.setAttempt(attempt);
        qa.setQuestion(question);
        qa.setOrderIndex(orderIndex);
        qa.setTopicId(question.getTopic() != null ? question.getTopic().getId() : null);
        qa.setDifficulty(question.getDifficulty());
        questionAttemptRepository.save(qa);
    }

    private StudentQuestionResponse toStudentQuestionResponse(Question question) {
        List<StudentQuestionOptionResponse> options = question.getOptions().stream()
                .map(StudentQuestionOptionResponse::from)
                .toList();
        return StudentQuestionResponse.from(question, options);
    }
}
