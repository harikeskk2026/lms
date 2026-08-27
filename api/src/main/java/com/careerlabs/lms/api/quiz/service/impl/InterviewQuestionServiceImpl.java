package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewCategoryCount;
import com.careerlabs.lms.api.quiz.dto.response.InterviewPrepPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewQuestionResponse;
import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.repository.InterviewQuestionRepository;
import com.careerlabs.lms.api.quiz.service.InterviewQuestionService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class InterviewQuestionServiceImpl implements InterviewQuestionService {

    private final InterviewQuestionRepository interviewQuestionRepository;

    public InterviewQuestionServiceImpl(InterviewQuestionRepository interviewQuestionRepository) {
        this.interviewQuestionRepository = interviewQuestionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public InterviewPrepPageResponse browse(String category, QuizDifficulty difficulty, String search, int page, int limit) {
        int safePage = Math.max(page, 1) - 1;
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);

        Specification<InterviewQuestion> spec = buildSpecification(true, category, difficulty, search);
        Page<InterviewQuestion> result = interviewQuestionRepository.findAll(spec,
                PageRequest.of(safePage, safeLimit, Sort.by("category").ascending().and(Sort.by("id").ascending())));

        List<InterviewQuestionResponse> questions = result.getContent().stream()
                .map(InterviewQuestionResponse::from)
                .toList();

        List<InterviewCategoryCount> categories = interviewQuestionRepository.countActiveByCategory().stream()
                .map(row -> new InterviewCategoryCount((String) row[0], (Long) row[1]))
                .toList();

        return new InterviewPrepPageResponse(questions, result.getTotalElements(), categories);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewQuestionResponse> listAll() {
        Specification<InterviewQuestion> spec = buildSpecification(null, null, null, null);
        return interviewQuestionRepository.findAll(spec, Sort.by("category").ascending().and(Sort.by("id").ascending()))
                .stream()
                .map(InterviewQuestionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InterviewQuestionResponse get(Long id) {
        return InterviewQuestionResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public InterviewQuestionResponse create(CreateInterviewQuestionRequest request, Long createdBy) {
        InterviewQuestion question = new InterviewQuestion();
        question.setCreatedBy(createdBy);
        applyRequest(question, request.getCategory(), request.getQuestionText(), request.getAnswerText(),
                request.getDifficulty(), request.getTags());
        return InterviewQuestionResponse.from(interviewQuestionRepository.save(question));
    }

    @Override
    @Transactional
    public InterviewQuestionResponse update(Long id, UpdateInterviewQuestionRequest request) {
        InterviewQuestion question = findOrThrow(id);
        applyRequest(question, request.getCategory(), request.getQuestionText(), request.getAnswerText(),
                request.getDifficulty(), request.getTags());
        if (request.getActive() != null) {
            question.setActive(request.getActive());
        }
        return InterviewQuestionResponse.from(interviewQuestionRepository.save(question));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        InterviewQuestion question = findOrThrow(id);
        question.setActive(false);
        interviewQuestionRepository.save(question);
    }

    private InterviewQuestion findOrThrow(Long id) {
        return interviewQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Interview question not found: " + id));
    }

    private void applyRequest(InterviewQuestion question, String category, String questionText, String answerText,
                               QuizDifficulty difficulty, List<String> tags) {
        question.setCategory(category);
        question.setQuestionText(questionText);
        question.setAnswerText(answerText);
        question.setDifficulty(difficulty);
        question.setTags(tags == null || tags.isEmpty() ? null : String.join(",", tags));
    }

    private Specification<InterviewQuestion> buildSpecification(Boolean active, String category,
                                                                  QuizDifficulty difficulty, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (difficulty != null) {
                predicates.add(cb.equal(root.get("difficulty"), difficulty));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("questionText")), pattern),
                        cb.like(cb.lower(root.get("answerText")), pattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
