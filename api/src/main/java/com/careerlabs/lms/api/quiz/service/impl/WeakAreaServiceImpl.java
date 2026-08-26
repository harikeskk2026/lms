package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.TopicPerformanceResponse;
import com.careerlabs.lms.api.quiz.dto.response.WeakAreaResponse;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.service.WeakAreaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WeakAreaServiceImpl implements WeakAreaService {

    private static final int PRACTICE_QUIZ_SIZE = 10;
    private static final int MINUTES_PER_QUESTION = 2;

    private final QuestionAttemptRepository questionAttemptRepository;
    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;

    public WeakAreaServiceImpl(QuestionAttemptRepository questionAttemptRepository,
                                QuestionRepository questionRepository, QuizRepository quizRepository,
                                QuizQuestionRepository quizQuestionRepository) {
        this.questionAttemptRepository = questionAttemptRepository;
        this.questionRepository = questionRepository;
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopicPerformanceResponse> getTopicPerformance(Long studentId) {
        List<QuestionAttempt> attempts = questionAttemptRepository.findAllSubmittedByStudentId(studentId);

        Map<Long, List<QuestionAttempt>> byTopic = attempts.stream()
                .filter(qa -> qa.getQuestion().getTopic() != null)
                .collect(Collectors.groupingBy(qa -> qa.getQuestion().getTopic().getId()));

        List<TopicPerformanceResponse> result = new ArrayList<>();
        for (Map.Entry<Long, List<QuestionAttempt>> entry : byTopic.entrySet()) {
            List<QuestionAttempt> topicAttempts = entry.getValue();
            String topicName = topicAttempts.get(0).getQuestion().getTopic().getName();
            int total = topicAttempts.size();
            int correct = (int) topicAttempts.stream().filter(qa -> Boolean.TRUE.equals(qa.getCorrect())).count();
            double accuracy = (correct * 100.0) / total;
            result.add(new TopicPerformanceResponse(entry.getKey(), topicName, total, correct, accuracy,
                    TopicPerformanceResponse.levelFor(accuracy)));
        }
        result.sort(Comparator.comparingDouble(TopicPerformanceResponse::accuracy));
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WeakAreaResponse> getWeakAreas(Long studentId) {
        return getTopicPerformance(studentId).stream()
                .filter(topic -> "WEAK".equals(topic.level()))
                .map(WeakAreaResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public StudentQuizResponse createPracticeQuiz(Long studentId) {
        List<WeakAreaResponse> weakAreas = getWeakAreas(studentId);
        if (weakAreas.isEmpty()) {
            throw new ConflictException("No weak areas detected yet — take a few quizzes first");
        }
        Set<Long> weakTopicIds = weakAreas.stream().map(WeakAreaResponse::topicId).collect(Collectors.toSet());

        List<Question> candidates = new ArrayList<>(questionRepository.findAll().stream()
                .filter(Question::isActive)
                .filter(q -> q.getTopic() != null && weakTopicIds.contains(q.getTopic().getId()))
                .toList());
        if (candidates.isEmpty()) {
            throw new ConflictException("No practice questions available for your weak topics yet");
        }
        Collections.shuffle(candidates);
        List<Question> selected = candidates.stream().limit(PRACTICE_QUIZ_SIZE).toList();

        Quiz quiz = new Quiz();
        quiz.setTitle("Weak Area Practice");
        quiz.setDescription("Personalized practice covering: " + weakAreas.stream()
                .map(WeakAreaResponse::topicName).distinct().collect(Collectors.joining(", ")));
        quiz.setType(QuizType.MCQ);
        quiz.setDifficulty(QuizDifficulty.MEDIUM);
        quiz.setDuration(selected.size() * MINUTES_PER_QUESTION);
        quiz.setPassingScore(60);
        quiz.setMaxAttempts(99);
        quiz.setRandomQuestions(true);
        quiz.setRandomOptions(true);
        quiz.setShowExplanation(true);
        quiz.setStatus(QuizStatus.PUBLISHED);
        quiz.setCreatedBy(studentId);
        quiz = quizRepository.save(quiz);

        int order = 0;
        for (Question question : selected) {
            QuizQuestion quizQuestion = new QuizQuestion();
            quizQuestion.setQuiz(quiz);
            quizQuestion.setQuestion(question);
            quizQuestion.setOrderIndex(order++);
            quizQuestionRepository.save(quizQuestion);
        }

        return StudentQuizResponse.from(quiz, selected.size(), 0);
    }
}
