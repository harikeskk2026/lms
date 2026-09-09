package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.quiz.dto.request.AssignQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.AttachQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.ReorderQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuestionResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizAssignmentResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.entity.AssignmentTargetType;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAssignment;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.ResultVisibility;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAssignmentRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.QuizAvailabilityService;
import com.careerlabs.lms.api.quiz.service.QuizService;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QuizServiceImpl implements QuizService {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAssignmentRepository quizAssignmentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final QuizAvailabilityService quizAvailabilityService;
    private final CourseAccessGuard accessGuard;

    public QuizServiceImpl(QuizRepository quizRepository, QuizQuestionRepository quizQuestionRepository,
                            QuestionRepository questionRepository, QuizAttemptRepository quizAttemptRepository,
                            QuizAssignmentRepository quizAssignmentRepository, CourseRepository courseRepository,
                            BatchRepository batchRepository, UserRepository userRepository,
                            QuizAvailabilityService quizAvailabilityService, CourseAccessGuard accessGuard) {
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.questionRepository = questionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAssignmentRepository = quizAssignmentRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.userRepository = userRepository;
        this.quizAvailabilityService = quizAvailabilityService;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizResponse> list() {
        return quizRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
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
                request.isRandomQuestions(), request.isRandomOptions(), request.isShowExplanation(),
                request.isNegativeMarking(), request.getResultVisibility(),
                request.getScheduledStart(), request.getScheduledEnd());

        return toResponse(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public QuizResponse update(Long id, UpdateQuizRequest request) {
        Quiz quiz = findOrThrow(id);
        boolean publishing = request.getStatus() == QuizStatus.PUBLISHED && quiz.getStatus() != QuizStatus.PUBLISHED;

        applyRequest(quiz, request.getTitle(), request.getDescription(), request.getType(), request.getDifficulty(),
                request.getDuration(), request.getPassingScore(), request.getMaxAttempts(),
                request.getCourseId(), request.getBatchId(),
                request.isRandomQuestions(), request.isRandomOptions(), request.isShowExplanation(),
                request.isNegativeMarking(), request.getResultVisibility(),
                request.getScheduledStart(), request.getScheduledEnd());

        if (publishing) {
            validateForPublish(quiz);
        }
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
        quizAssignmentRepository.deleteByQuizId(id);
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
    @Transactional
    public QuizResponse reorderQuestions(Long quizId, ReorderQuestionsRequest request) {
        Quiz quiz = findOrThrow(quizId);
        List<QuizQuestion> existing = quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(quizId);
        Map<Long, QuizQuestion> byQuestionId = new HashMap<>();
        for (QuizQuestion qq : existing) {
            byQuestionId.put(qq.getQuestion().getId(), qq);
        }

        int index = 0;
        for (ReorderQuestionsRequest.Item item : request.getItems()) {
            QuizQuestion qq = byQuestionId.get(item.getQuestionId());
            if (qq == null) {
                throw new ResourceNotFoundException("Question " + item.getQuestionId() + " is not part of this quiz");
            }
            qq.setOrderIndex(index++);
            if (item.getMarks() != null) {
                qq.setMarks(item.getMarks());
            }
            quizQuestionRepository.save(qq);
        }

        return toResponse(quiz);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentQuizResponse> listPublished(Long studentId) {
        // Use a LinkedHashMap to deduplicate by key (ID for standard quizzes, title for practice quizzes)
        // while preserving creation-time order. This prevents duplicate practice quizzes (e.g. "Weak Area Practice" ids 8 & 12)
        // from polluting the student quiz list and Analytics' improvementHistory.
        java.util.Map<String, StudentQuizResponse> seen = new java.util.LinkedHashMap<>();
        for (Quiz quiz : quizRepository.findAllByStatusOrderByCreatedAtDesc(QuizStatus.PUBLISHED)) {
            if (isLinkedToUnavailableCourse(quiz)) {
                continue;
            }
            if (!quizAvailabilityService.isAssignedTo(quiz, studentId)) {
                continue;
            }
            String dedupeKey = (quiz.getTitle() != null && quiz.getTitle().toLowerCase().contains("practice"))
                    ? "PRACTICE_" + quiz.getTitle().trim().toLowerCase()
                    : "QUIZ_" + quiz.getId();
            if (!seen.containsKey(dedupeKey)) {
                seen.put(dedupeKey, toStudentResponse(quiz, studentId));
            }
        }
        return new java.util.ArrayList<>(seen.values());
    }

    @Override
    @Transactional(readOnly = true)
    public StudentQuizResponse getPublished(Long id, Long studentId) {
        Quiz quiz = findOrThrow(id);
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Quiz not found: " + id);
        }
        if (isLinkedToUnavailableCourse(quiz)) {
            throw new ForbiddenException("This course is not currently available");
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

    @Override
    @Transactional
    public List<QuizAssignmentResponse> assign(Long quizId, AssignQuizRequest request, Long assignedBy) {
        findOrThrow(quizId);
        if (request.getAvailableFrom() != null && request.getAvailableUntil() != null
                && !request.getAvailableFrom().isBefore(request.getAvailableUntil())) {
            throw new BadRequestException("Available-from must be before available-until");
        }

        for (Long targetId : request.getTargetIds()) {
            validateTarget(request.getTargetType(), targetId);
            if (quizAssignmentRepository.findByQuizIdAndTargetTypeAndTargetId(quizId, request.getTargetType(), targetId).isPresent()) {
                continue;
            }
            QuizAssignment assignment = new QuizAssignment();
            assignment.setQuiz(quizRepository.getReferenceById(quizId));
            assignment.setTargetType(request.getTargetType());
            assignment.setTargetId(targetId);
            assignment.setAvailableFrom(request.getAvailableFrom());
            assignment.setAvailableUntil(request.getAvailableUntil());
            assignment.setAssignedBy(assignedBy);
            quizAssignmentRepository.save(assignment);
        }

        return getAssignments(quizId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizAssignmentResponse> getAssignments(Long quizId) {
        findOrThrow(quizId);
        return quizAssignmentRepository.findByQuizId(quizId).stream()
                .map(a -> QuizAssignmentResponse.from(a, resolveTargetLabel(a.getTargetType(), a.getTargetId())))
                .toList();
    }

    @Override
    @Transactional
    public void removeAssignment(Long quizId, Long assignmentId) {
        QuizAssignment assignment = quizAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        if (!assignment.getQuiz().getId().equals(quizId)) {
            throw new ResourceNotFoundException("Assignment not found for this quiz: " + assignmentId);
        }
        quizAssignmentRepository.delete(assignment);
    }

    @Override
    @Transactional
    public QuizResponse releaseResults(Long quizId) {
        Quiz quiz = findOrThrow(quizId);
        if (quiz.getResultVisibility() != ResultVisibility.MANUAL) {
            throw new BadRequestException("Only quizzes set to manual result release can be released this way");
        }
        quiz.setResultsReleased(true);
        return toResponse(quizRepository.save(quiz));
    }

    private void validateTarget(AssignmentTargetType targetType, Long targetId) {
        switch (targetType) {
            case BATCH -> {
                if (!batchRepository.existsById(targetId)) {
                    throw new ResourceNotFoundException("Batch not found: " + targetId);
                }
            }
            case COURSE -> {
                if (!courseRepository.existsById(targetId)) {
                    throw new ResourceNotFoundException("Course not found: " + targetId);
                }
            }
            case STUDENT -> {
                if (userRepository.findById(targetId).isEmpty()) {
                    throw new ResourceNotFoundException("Student user not found: " + targetId);
                }
            }
        }
    }

    private String resolveTargetLabel(AssignmentTargetType targetType, Long targetId) {
        return switch (targetType) {
            case BATCH -> batchRepository.findById(targetId).map(Batch::getName).orElse("Unknown batch");
            case COURSE -> courseRepository.findById(targetId).map(Course::getTitle).orElse("Unknown course");
            case STUDENT -> userRepository.findById(targetId).map(User::getName).orElse("Unknown student");
        };
    }

    private void validateForPublish(Quiz quiz) {
        List<String> missing = new ArrayList<>();
        if (quizQuestionRepository.countByQuizId(quiz.getId()) == 0) {
            missing.add("at least one question");
        }
        boolean hasAssignment = quizAssignmentRepository.existsByQuizId(quiz.getId())
                || quiz.getCourseId() != null || quiz.getBatchId() != null;
        if (!hasAssignment) {
            missing.add("an assignment to at least one batch, course, or student");
        }
        if (!missing.isEmpty()) {
            throw new BadRequestException("Quiz cannot be published — add " + String.join(" and ", missing) + ".");
        }
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

    /** A quiz tied to a course whose status is not readable (e.g. DRAFT) is hidden from students. Courses without a link are unaffected. */
    private boolean isLinkedToUnavailableCourse(Quiz quiz) {
        return quiz.getCourseId() != null && !accessGuard.isReadableCourse(quiz.getCourseId());
    }

    private void applyRequest(Quiz quiz, String title, String description,
                               com.careerlabs.lms.api.quiz.entity.QuizType type,
                               com.careerlabs.lms.api.quiz.entity.QuizDifficulty difficulty,
                               Integer duration, Integer passingScore, Integer maxAttempts,
                               Long courseId, Long batchId, boolean randomQuestions,
                               boolean randomOptions, boolean showExplanation,
                               boolean negativeMarking, ResultVisibility resultVisibility,
                               LocalDateTime scheduledStart, LocalDateTime scheduledEnd) {
        if (courseId != null && !courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course not found: " + courseId);
        }
        if (batchId != null && !batchRepository.existsById(batchId)) {
            throw new ResourceNotFoundException("Batch not found: " + batchId);
        }
        if (scheduledStart != null && scheduledEnd != null && !scheduledStart.isBefore(scheduledEnd)) {
            throw new BadRequestException("Scheduled start must be before scheduled end");
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
        quiz.setNegativeMarking(negativeMarking);
        quiz.setResultVisibility(resultVisibility != null ? resultVisibility : ResultVisibility.IMMEDIATE);
        quiz.setScheduledStart(scheduledStart);
        quiz.setScheduledEnd(scheduledEnd);
    }

    private QuizResponse toResponse(Quiz quiz) {
        List<QuizQuestion> quizQuestions = quizQuestionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
        List<QuestionResponse> questions = quizQuestions.stream()
                .map(qq -> QuestionResponse.from(qq.getQuestion(), qq.getMarks()))
                .toList();
        String courseName = quiz.getCourseId() == null ? null
                : courseRepository.findById(quiz.getCourseId()).map(Course::getTitle).orElse(null);
        String batchName = quiz.getBatchId() == null ? null
                : batchRepository.findById(quiz.getBatchId()).map(Batch::getName).orElse(null);
        List<QuizAssignmentResponse> assignments = getAssignments(quiz.getId());
        return QuizResponse.from(quiz, questions, courseName, batchName, quizAvailabilityService.effectiveStatus(quiz), assignments);
    }

    private StudentQuizResponse toStudentResponse(Quiz quiz, Long studentId) {
        int totalQuestions = (int) quizQuestionRepository.countByQuizId(quiz.getId());
        int attemptsUsed = (int) quizAttemptRepository
                .countByQuizIdAndStudentIdAndStatus(quiz.getId(), studentId, AttemptStatus.SUBMITTED);
        return StudentQuizResponse.from(quiz, totalQuestions, attemptsUsed, quizAvailabilityService.effectiveStatus(quiz));
    }
}
