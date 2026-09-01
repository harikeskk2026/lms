package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.request.SubmitAnswerRequest;
import com.careerlabs.lms.api.quiz.dto.response.QuizAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResultResponse;
import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuestionOptionResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuestionResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizEffectiveStatus;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.GamificationService;
import com.careerlabs.lms.api.quiz.service.QuizAttemptService;
import com.careerlabs.lms.api.quiz.service.QuizAvailabilityService;
import com.careerlabs.lms.api.quiz.service.QuizScoringService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QuizAttemptServiceImpl implements QuizAttemptService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionAttemptRepository questionAttemptRepository;
    private final QuizScoringService quizScoringService;
    private final GamificationService gamificationService;
    private final QuizAvailabilityService quizAvailabilityService;

    public QuizAttemptServiceImpl(QuizRepository quizRepository, QuizQuestionRepository quizQuestionRepository,
                                   QuizAttemptRepository quizAttemptRepository,
                                   QuestionAttemptRepository questionAttemptRepository,
                                   QuizScoringService quizScoringService, GamificationService gamificationService,
                                   QuizAvailabilityService quizAvailabilityService) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.quizScoringService = quizScoringService;
        this.gamificationService = gamificationService;
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
        if (quiz.getType() == QuizType.ADAPTIVE) {
            throw new ConflictException("This quiz uses adaptive mode — start it via the adaptive quiz endpoint");
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
                .map(existing -> expireIfStale(existing, quiz))
                .orElseGet(() -> createAttempt(quiz, studentId));

        List<QuestionAttempt> questionAttempts = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attempt.getId());
        List<StudentQuestionResponse> questions = questionAttempts.stream()
                .map(qa -> toStudentQuestionResponse(qa.getQuestion(), quiz.isRandomOptions()))
                .toList();

        return StartAttemptResponse.from(attempt, questions);
    }

    private QuizAttempt expireIfStale(QuizAttempt attempt, Quiz quiz) {
        if (quiz.getDuration() != null && quiz.getDuration() > 0) {
            Instant expiryTime = attempt.getStartedAt().plusSeconds(quiz.getDuration() * 60L);
            if (Instant.now().isAfter(expiryTime)) {
                List<QuestionAttempt> questionAttempts = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attempt.getId());
                attempt.setStatus(AttemptStatus.SUBMITTED);
                attempt.setCompletedAt(expiryTime);
                attempt.setTimeTaken(quiz.getDuration() * 60);
                attempt.setScore(0);
                attempt.setAccuracy(0.0);
                attempt.setCorrectCount(0);
                attempt.setSkippedCount(questionAttempts.size());
                attempt.setWrongCount(0);
                attempt.setPassed(false);
                quizAttemptRepository.save(attempt);
                return null;
            }
        }
        return attempt;
    }

    private QuizAttempt createAttempt(Quiz quiz, Long studentId) {
        long submittedCount = quizAttemptRepository
                .countByQuizIdAndStudentIdAndStatus(quiz.getId(), studentId, AttemptStatus.SUBMITTED);
        if (submittedCount >= quiz.getMaxAttempts()) {
            throw new ConflictException("Maximum attempts reached for this quiz");
        }

        List<QuizQuestion> quizQuestions = quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
        if (quizQuestions.isEmpty()) {
            throw new ConflictException("Quiz has no questions yet");
        }

        Map<Long, Integer> effectiveMarksByQuestionId = new HashMap<>();
        for (QuizQuestion qq : quizQuestions) {
            effectiveMarksByQuestionId.put(qq.getQuestion().getId(),
                    qq.getMarks() != null ? qq.getMarks() : qq.getQuestion().getPoints());
        }

        List<Question> questions = new ArrayList<>(quizQuestions.stream().map(QuizQuestion::getQuestion).toList());
        if (quiz.isRandomQuestions()) {
            Collections.shuffle(questions);
        }

        int totalScore = questions.stream().mapToInt(q -> effectiveMarksByQuestionId.get(q.getId())).sum();

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setStudentId(studentId);
        attempt.setAttemptNumber((int) submittedCount + 1);
        attempt.setStartedAt(Instant.now());
        attempt.setTotalScore(totalScore);
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt = quizAttemptRepository.save(attempt);

        List<QuestionAttempt> placeholders = new ArrayList<>();
        int index = 0;
        for (Question question : questions) {
            QuestionAttempt qa = new QuestionAttempt();
            qa.setAttempt(attempt);
            qa.setQuestion(question);
            qa.setOrderIndex(index++);
            qa.setMaxPoints(effectiveMarksByQuestionId.get(question.getId()));
            qa.setTopicId(question.getTopic() != null ? question.getTopic().getId() : null);
            qa.setDifficulty(question.getDifficulty());
            placeholders.add(qa);
        }
        questionAttemptRepository.saveAll(placeholders);

        return attempt;
    }

    @Override
    @Transactional
    public void saveAnswer(Long attemptId, Long studentId, SubmitAnswerRequest request) {
        QuizAttempt attempt = findAttemptOwnedBy(attemptId, studentId);
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ConflictException("This attempt has already been submitted");
        }

        QuestionAttempt questionAttempt = questionAttemptRepository
                .findByAttemptIdAndQuestionId(attemptId, request.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Question is not part of this attempt"));

        List<Long> selectedIds = request.getSelectedOptionIds() == null ? List.of() : request.getSelectedOptionIds();
        List<QuestionOption> selectedOptions = questionAttempt.getQuestion().getOptions().stream()
                .filter(option -> selectedIds.contains(option.getId()))
                .toList();

        questionAttempt.setSelectedOptions(new ArrayList<>(selectedOptions));
        questionAttempt.setTimeTaken(request.getTimeTaken());
        questionAttemptRepository.save(questionAttempt);
    }

    @Override
    @Transactional
    public QuizResultResponse submit(Long attemptId, Long studentId) {
        QuizAttempt attempt = findAttemptOwnedBy(attemptId, studentId);
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ConflictException("This attempt has already been submitted");
        }

        List<QuestionAttempt> questionAttempts = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attemptId);
        boolean negativeMarking = attempt.getQuiz().isNegativeMarking();
        questionAttempts.forEach(qa -> quizScoringService.score(qa, negativeMarking));

        int correctCount = 0;
        int skippedCount = 0;
        int score = 0;
        for (QuestionAttempt qa : questionAttempts) {
            score += qa.getPointsEarned();
            if (Boolean.TRUE.equals(qa.getCorrect())) {
                correctCount++;
            } else if (qa.getSelectedOptions().isEmpty()) {
                skippedCount++;
            }
        }
        int wrongCount = questionAttempts.size() - correctCount - skippedCount;

        Instant completedAt = Instant.now();
        int totalScore = attempt.getTotalScore() == null ? 0 : attempt.getTotalScore();
        boolean passed = totalScore > 0 && (score * 100.0 / totalScore) >= attempt.getQuiz().getPassingScore();

        attempt.setScore(score);
        attempt.setAccuracy(questionAttempts.isEmpty() ? 0.0 : (correctCount * 100.0) / questionAttempts.size());
        attempt.setCorrectCount(correctCount);
        attempt.setWrongCount(wrongCount);
        attempt.setSkippedCount(skippedCount);
        attempt.setCompletedAt(completedAt);
        attempt.setTimeTaken((int) Duration.between(attempt.getStartedAt(), completedAt).getSeconds());
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setPassed(passed);

        quizAttemptRepository.save(attempt);
        questionAttemptRepository.saveAll(questionAttempts);
        gamificationService.processSubmission(studentId, attempt);

        return QuizResultResponse.from(attempt, questionAttempts, attempt.getQuiz().isShowExplanation(),
                isResultsPending(attempt.getQuiz()));
    }

    @Override
    @Transactional(readOnly = true)
    public QuizResultResponse get(Long attemptId, Long studentId) {
        QuizAttempt attempt = findAttemptOwnedBy(attemptId, studentId);
        List<QuestionAttempt> questionAttempts = questionAttemptRepository.findByAttemptIdOrderByOrderIndexAsc(attemptId);
        return QuizResultResponse.from(attempt, questionAttempts, attempt.getQuiz().isShowExplanation(),
                isResultsPending(attempt.getQuiz()));
    }

    /**
     * Whether a SUBMITTED attempt's score/answer-key should stay hidden per the
     * quiz's {@code resultVisibility} rule — re-evaluated on every read, so a quiz
     * that closes (AFTER_CLOSE) or gets an admin release (MANUAL) reveals results
     * without needing to touch the attempt row itself.
     */
    private boolean isResultsPending(Quiz quiz) {
        return switch (quiz.getResultVisibility()) {
            case IMMEDIATE -> false;
            case AFTER_CLOSE -> {
                QuizEffectiveStatus status = quizAvailabilityService.effectiveStatus(quiz);
                yield status != QuizEffectiveStatus.COMPLETED && status != QuizEffectiveStatus.ARCHIVED;
            }
            case MANUAL -> !quiz.isResultsReleased();
        };
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> listMine(Long studentId) {
        return quizAttemptRepository.findByStudentIdOrderByStartedAtDesc(studentId).stream()
                .map(QuizAttemptResponse::from)
                .toList();
    }

    private QuizAttempt findAttemptOwnedBy(Long attemptId, Long studentId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found: " + attemptId));
        if (!attempt.getStudentId().equals(studentId)) {
            throw new ForbiddenException("This attempt does not belong to you");
        }
        return attempt;
    }

    private StudentQuestionResponse toStudentQuestionResponse(Question question, boolean randomOptions) {
        List<QuestionOption> options = new ArrayList<>(question.getOptions());
        if (randomOptions) {
            Collections.shuffle(options);
        }
        List<StudentQuestionOptionResponse> optionResponses = options.stream()
                .map(StudentQuestionOptionResponse::from)
                .toList();
        return StudentQuestionResponse.from(question, optionResponses);
    }
}
