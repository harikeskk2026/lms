package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.quiz.dto.request.AttachQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuestionResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.QuizService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class QuizServiceImpl implements QuizService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;

    public QuizServiceImpl(QuizRepository quizRepository, QuizQuestionRepository quizQuestionRepository,
                            QuestionRepository questionRepository, QuizAttemptRepository quizAttemptRepository,
                            CourseRepository courseRepository, BatchRepository batchRepository) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.questionRepository = questionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizResponse> list() {
        return quizRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(quiz -> toResponse(quiz))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QuizResponse get(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    @Transactional
    public QuizResponse create(CreateQuizRequest request, Long createdBy) {
        Quiz quiz = new Quiz();
        quiz.setCreatedBy(createdBy);
        applyRequest(quiz, request.getTitle(), request.getDescription(), request.getType(), request.getDifficulty(),
                request.getDuration(), request.getPassingScore(), request.getMaxAttempts(),
                request.getCourseId(), request.getBatchId(),
                request.isRandomQuestions(), request.isRandomOptions(), request.isShowExplanation());

        return toResponse(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public QuizResponse update(Long id, UpdateQuizRequest request) {
        Quiz quiz = findOrThrow(id);
        applyRequest(quiz, request.getTitle(), request.getDescription(), request.getType(), request.getDifficulty(),
                request.getDuration(), request.getPassingScore(), request.getMaxAttempts(),
                request.getCourseId(), request.getBatchId(),
                request.isRandomQuestions(), request.isRandomOptions(), request.isShowExplanation());
        quiz.setStatus(request.getStatus());

        return toResponse(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Quiz quiz = findOrThrow(id);
        if (quizAttemptRepository.existsByQuizId(id)) {
            throw new ConflictException("Cannot delete a quiz that already has attempts; archive it instead");
        }
        quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(id).forEach(quizQuestionRepository::delete);
        quizRepository.delete(quiz);
    }

    @Override
    @Transactional
    public QuizResponse attachQuestions(Long quizId, AttachQuestionsRequest request) {
        Quiz quiz = findOrThrow(quizId);
        int nextOrder = (int) quizQuestionRepository.countByQuizId(quizId);

        for (Long questionId : request.getQuestionIds()) {
            if (quizQuestionRepository.existsByQuizIdAndQuestionId(quizId, questionId)) {
                continue;
            }
            Question question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Question not found: " + questionId));

            QuizQuestion quizQuestion = new QuizQuestion();
            quizQuestion.setQuiz(quiz);
            quizQuestion.setQuestion(question);
            quizQuestion.setOrderIndex(nextOrder++);
            quizQuestionRepository.save(quizQuestion);
        }

        return toResponse(quiz);
    }

    @Override
    @Transactional
    public QuizResponse detachQuestion(Long quizId, Long questionId) {
        Quiz quiz = findOrThrow(quizId);
        quizQuestionRepository.deleteByQuizIdAndQuestionId(quizId, questionId);
        return toResponse(quiz);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentQuizResponse> listPublished(Long studentId) {
        return quizRepository.findAllByStatusOrderByCreatedAtDesc(QuizStatus.PUBLISHED).stream()
                .map(quiz -> toStudentResponse(quiz, studentId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentQuizResponse getPublished(Long id, Long studentId) {
        Quiz quiz = findOrThrow(id);
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Quiz not found: " + id);
        }
        return toStudentResponse(quiz, studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminQuizAnalyticsResponse getAnalytics(Long id) {
        findOrThrow(id);
        List<QuizAttempt> submitted = quizAttemptRepository.findByQuizIdAndStatus(id, AttemptStatus.SUBMITTED);

        long totalAttempts = submitted.size();
        double averageScore = submitted.stream().mapToDouble(this::scorePercentage).average().orElse(0);
        double passRate = totalAttempts == 0 ? 0 : submitted.stream()
                .filter(a -> Boolean.TRUE.equals(a.getPassed())).count() * 100.0 / totalAttempts;
        double averageTime = submitted.stream()
                .filter(a -> a.getTimeTaken() != null)
                .mapToInt(QuizAttempt::getTimeTaken)
                .average().orElse(0);

        return new AdminQuizAnalyticsResponse(totalAttempts, round1(averageScore), round1(passRate), round1(averageTime));
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

    private Quiz findOrThrow(Long id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found: " + id));
    }

    private void applyRequest(Quiz quiz, String title, String description,
                               com.careerlabs.lms.api.quiz.entity.QuizType type,
                               com.careerlabs.lms.api.quiz.entity.QuizDifficulty difficulty,
                               Integer duration, Integer passingScore, Integer maxAttempts,
                               Long courseId, Long batchId, boolean randomQuestions,
                               boolean randomOptions, boolean showExplanation) {
        if (courseId != null && !courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course not found: " + courseId);
        }
        if (batchId != null && !batchRepository.existsById(batchId)) {
            throw new ResourceNotFoundException("Batch not found: " + batchId);
        }

        quiz.setTitle(title);
        quiz.setDescription(description);
        quiz.setType(type);
        quiz.setDifficulty(difficulty);
        quiz.setDuration(duration);
        quiz.setPassingScore(passingScore);
        quiz.setMaxAttempts(maxAttempts);
        quiz.setCourseId(courseId);
        quiz.setBatchId(batchId);
        quiz.setRandomQuestions(randomQuestions);
        quiz.setRandomOptions(randomOptions);
        quiz.setShowExplanation(showExplanation);
    }

    private QuizResponse toResponse(Quiz quiz) {
        List<QuestionResponse> questions = quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId())
                .stream()
                .map(qq -> QuestionResponse.from(qq.getQuestion()))
                .toList();
        String courseName = quiz.getCourseId() == null ? null
                : courseRepository.findById(quiz.getCourseId()).map(Course::getTitle).orElse(null);
        String batchName = quiz.getBatchId() == null ? null
                : batchRepository.findById(quiz.getBatchId()).map(Batch::getName).orElse(null);
        return QuizResponse.from(quiz, questions, courseName, batchName);
    }

    private StudentQuizResponse toStudentResponse(Quiz quiz, Long studentId) {
        int totalQuestions = (int) quizQuestionRepository.countByQuizId(quiz.getId());
        int attemptsUsed = (int) quizAttemptRepository
                .countByQuizIdAndStudentIdAndStatus(quiz.getId(), studentId, AttemptStatus.SUBMITTED);
        return StudentQuizResponse.from(quiz, totalQuestions, attemptsUsed);
    }
}
