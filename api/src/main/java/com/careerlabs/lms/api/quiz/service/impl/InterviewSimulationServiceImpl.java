package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.response.InterviewSimulationResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.service.InterviewSimulationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class InterviewSimulationServiceImpl implements InterviewSimulationService {

    private static final Set<QuestionType> PROBLEM_SOLVING_TYPES = Set.of(QuestionType.SCENARIO, QuestionType.DEBUGGING);

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionAttemptRepository questionAttemptRepository;

    public InterviewSimulationServiceImpl(QuizAttemptRepository quizAttemptRepository,
                                           QuestionAttemptRepository questionAttemptRepository) {
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionAttemptRepository = questionAttemptRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public InterviewSimulationResponse getResult(Long attemptId, Long studentId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));
        if (!attempt.getStudentId().equals(studentId)) {
            throw new ForbiddenException("This attempt does not belong to you");
        }
        if (attempt.getStatus() != AttemptStatus.SUBMITTED) {
            throw new ConflictException("Attempt has not been submitted yet");
        }
        if (attempt.getQuiz().getType() != QuizType.INTERVIEW_PREP) {
            throw new ConflictException("This quiz is not an interview simulation");
        }

        List<QuestionAttempt> questionAttempts = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attemptId);

        List<QuestionAttempt> problemSolving = questionAttempts.stream()
                .filter(qa -> PROBLEM_SOLVING_TYPES.contains(qa.getQuestion().getQuestionType()))
                .toList();
        List<QuestionAttempt> technical = questionAttempts.stream()
                .filter(qa -> !PROBLEM_SOLVING_TYPES.contains(qa.getQuestion().getQuestionType()))
                .toList();

        double technicalKnowledge = accuracyOf(technical.isEmpty() ? questionAttempts : technical);
        double problemSolvingScore = accuracyOf(problemSolving.isEmpty() ? questionAttempts : problemSolving);
        double accuracy = attempt.getAccuracy() == null ? 0 : attempt.getAccuracy();

        double allottedSeconds = attempt.getQuiz().getDuration() == null ? 0 : attempt.getQuiz().getDuration() * 60.0;
        double timeTaken = attempt.getTimeTaken() == null ? allottedSeconds : attempt.getTimeTaken();
        double speedScore = allottedSeconds <= 0 ? 0 : Math.max(0, 100 - (timeTaken / allottedSeconds) * 100);

        double readiness = (technicalKnowledge + problemSolvingScore + accuracy + speedScore) / 4.0;

        return new InterviewSimulationResponse(
                round1(technicalKnowledge), round1(problemSolvingScore), round1(accuracy), round1(speedScore),
                round1(readiness), InterviewSimulationResponse.levelFor(readiness));
    }

    private double accuracyOf(List<QuestionAttempt> attempts) {
        if (attempts.isEmpty()) {
            return 0;
        }
        long correct = attempts.stream().filter(qa -> Boolean.TRUE.equals(qa.getCorrect())).count();
        return (correct * 100.0) / attempts.size();
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
