package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.QuestionOptionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuestionAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuestionResponse;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.entity.QuizTopic;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizTopicRepository;
import com.careerlabs.lms.api.quiz.service.QuestionService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class QuestionServiceImpl implements QuestionService {

    private final QuestionRepository questionRepository;
    private final QuizTopicRepository quizTopicRepository;
    private final QuestionAttemptRepository questionAttemptRepository;

    public QuestionServiceImpl(QuestionRepository questionRepository, QuizTopicRepository quizTopicRepository,
                                QuestionAttemptRepository questionAttemptRepository) {
        this.questionRepository = questionRepository;
        this.quizTopicRepository = quizTopicRepository;
        this.questionAttemptRepository = questionAttemptRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuestionResponse> search(Long topicId, QuizDifficulty difficulty, QuestionType questionType,
                                          Boolean active, String search) {
        Specification<Question> spec = buildSpecification(topicId, difficulty, questionType, active, search);
        return questionRepository.findAll(spec).stream()
                .map(QuestionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public QuestionResponse get(Long id) {
        return QuestionResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public QuestionResponse create(CreateQuestionRequest request, Long createdBy) {
        Question question = new Question();
        question.setCreatedBy(createdBy);
        applyRequest(question, request.getTopicId(), request.getQuestionText(), request.getQuestionType(),
                request.getDifficulty(), request.getExplanation(), request.getCodeSnippet(), request.getPoints(),
                request.getOptions());

        return QuestionResponse.from(questionRepository.save(question));
    }

    @Override
    @Transactional
    public QuestionResponse update(Long id, UpdateQuestionRequest request) {
        Question question = findOrThrow(id);
        applyRequest(question, request.getTopicId(), request.getQuestionText(), request.getQuestionType(),
                request.getDifficulty(), request.getExplanation(), request.getCodeSnippet(), request.getPoints(),
                request.getOptions());
        question.setActive(request.isActive());

        return QuestionResponse.from(questionRepository.save(question));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Question question = findOrThrow(id);
        question.setActive(false);
        questionRepository.save(question);
    }

    @Override
    @Transactional
    public QuestionResponse duplicate(Long id) {
        Question source = findOrThrow(id);

        Question copy = new Question();
        copy.setTopic(source.getTopic());
        copy.setQuestionText(source.getQuestionText() + " (Copy)");
        copy.setQuestionType(source.getQuestionType());
        copy.setDifficulty(source.getDifficulty());
        copy.setExplanation(source.getExplanation());
        copy.setCodeSnippet(source.getCodeSnippet());
        copy.setPoints(source.getPoints());
        copy.setActive(true);
        copy.setCreatedBy(source.getCreatedBy());

        List<QuestionOption> copiedOptions = new ArrayList<>();
        for (QuestionOption option : source.getOptions()) {
            QuestionOption optionCopy = new QuestionOption();
            optionCopy.setQuestion(copy);
            optionCopy.setOptionText(option.getOptionText());
            optionCopy.setCorrect(option.isCorrect());
            optionCopy.setOrderIndex(option.getOrderIndex());
            copiedOptions.add(optionCopy);
        }
        copy.setOptions(copiedOptions);

        return QuestionResponse.from(questionRepository.save(copy));
    }

    @Override
    @Transactional(readOnly = true)
    public AdminQuestionAnalyticsResponse getAnalytics(Long id) {
        findOrThrow(id);
        List<QuestionAttempt> submitted = questionAttemptRepository.findByQuestionId(id).stream()
                .filter(qa -> qa.getAttempt().getStatus() == AttemptStatus.SUBMITTED)
                .toList();

        long attempts = submitted.size();
        long correct = submitted.stream().filter(qa -> Boolean.TRUE.equals(qa.getCorrect())).count();
        long wrong = attempts - correct;
        double accuracy = attempts == 0 ? 0 : (correct * 100.0) / attempts;
        double averageTime = submitted.stream()
                .filter(qa -> qa.getTimeTaken() != null)
                .mapToInt(QuestionAttempt::getTimeTaken)
                .average().orElse(0);

        return new AdminQuestionAnalyticsResponse(attempts, correct, wrong, round1(accuracy), round1(averageTime));
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private Question findOrThrow(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found: " + id));
    }

    private void applyRequest(Question question, Long topicId, String questionText, QuestionType questionType,
                               QuizDifficulty difficulty, String explanation, String codeSnippet, Integer points,
                               List<QuestionOptionRequest> optionRequests) {
        question.setTopic(resolveTopic(topicId));
        question.setQuestionText(questionText);
        question.setQuestionType(questionType);
        question.setDifficulty(difficulty);
        question.setExplanation(explanation);
        question.setCodeSnippet(codeSnippet);
        question.setPoints(points);

        question.getOptions().clear();
        int index = 0;
        for (QuestionOptionRequest optionRequest : optionRequests) {
            QuestionOption option = new QuestionOption();
            option.setQuestion(question);
            option.setOptionText(optionRequest.getOptionText());
            option.setCorrect(optionRequest.isCorrect());
            option.setOrderIndex(index++);
            question.getOptions().add(option);
        }
    }

    private QuizTopic resolveTopic(Long topicId) {
        if (topicId == null) {
            return null;
        }
        return quizTopicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz topic not found: " + topicId));
    }

    private Specification<Question> buildSpecification(Long topicId, QuizDifficulty difficulty,
                                                         QuestionType questionType, Boolean active, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (topicId != null) {
                predicates.add(cb.equal(root.get("topic").get("id"), topicId));
            }
            if (difficulty != null) {
                predicates.add(cb.equal(root.get("difficulty"), difficulty));
            }
            if (questionType != null) {
                predicates.add(cb.equal(root.get("questionType"), questionType));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (search != null && !search.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("questionText")), "%" + search.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
