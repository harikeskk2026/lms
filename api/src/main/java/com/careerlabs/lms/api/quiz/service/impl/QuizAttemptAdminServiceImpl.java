package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResultResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.QuizAttemptAdminService;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class QuizAttemptAdminServiceImpl implements QuizAttemptAdminService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionAttemptRepository questionAttemptRepository;
    private final UserRepository userRepository;

    public QuizAttemptAdminServiceImpl(QuizRepository quizRepository, QuizAttemptRepository quizAttemptRepository,
                                        QuestionAttemptRepository questionAttemptRepository, UserRepository userRepository) {
        this.quizRepository = quizRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminQuizAttemptResponse> listAttempts(Long quizId) {
        if (!quizRepository.existsById(quizId)) {
            throw new ResourceNotFoundException("Quiz not found: " + quizId);
        }

        List<QuizAttempt> attempts = quizAttemptRepository.findByQuizIdAndStatus(quizId, AttemptStatus.SUBMITTED);

        List<Long> studentIds = attempts.stream().map(QuizAttempt::getStudentId).distinct().toList();
        Map<Long, String> namesByStudentId = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));

        return attempts.stream()
                .sorted(Comparator.comparing(QuizAttempt::getCompletedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(a -> AdminQuizAttemptResponse.from(a, namesByStudentId.getOrDefault(a.getStudentId(), "Unknown Student")))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QuizResultResponse getAttemptReview(Long quizId, Long attemptId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));

        Quiz quiz = attempt.getQuiz();
        if (quiz == null || !quiz.getId().equals(quizId)) {
            throw new BadRequestException("Attempt " + attemptId + " does not belong to quiz " + quizId);
        }

        List<QuestionAttempt> questionAttempts = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attemptId);

        // Admin review always shows full detail — explanations shown and results
        // never treated as pending, regardless of the quiz's own showExplanation/
        // resultVisibility settings (those gates are for the student-facing view).
        return QuizResultResponse.from(attempt, questionAttempts, true, false);
    }
}
