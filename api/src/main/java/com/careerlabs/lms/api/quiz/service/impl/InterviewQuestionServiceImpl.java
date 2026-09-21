package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewCategoryCount;
import com.careerlabs.lms.api.quiz.dto.response.InterviewPrepPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewQuestionPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewQuestionResponse;
import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.repository.InterviewQuestionRepository;
import com.careerlabs.lms.api.quiz.service.InterviewQuestionService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class InterviewQuestionServiceImpl implements InterviewQuestionService {

    private final InterviewQuestionRepository interviewQuestionRepository;
    private final CourseRepository courseRepository;

    public InterviewQuestionServiceImpl(InterviewQuestionRepository interviewQuestionRepository,
                                        CourseRepository courseRepository) {
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public InterviewPrepPageResponse browse(String category, QuizDifficulty difficulty, String search,
                                            Long courseId, int page, int limit) {
        int safePage = Math.max(page, 1) - 1;
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);

        Specification<InterviewQuestion> spec = buildSpecification(true, category, difficulty, search, courseId, true);
        Page<InterviewQuestion> result = interviewQuestionRepository.findAll(spec,
                PageRequest.of(safePage, safeLimit, Sort.by("category").ascending().and(Sort.by("id").ascending())));

        List<InterviewQuestionResponse> questions = result.getContent().stream()
                .map(InterviewQuestionResponse::from)
                .toList();

        List<InterviewCategoryCount> categories = interviewQuestionRepository.countActiveByCategory(courseId).stream()
                .map(row -> new InterviewCategoryCount((String) row[0], (Long) row[1]))
                .toList();

        return new InterviewPrepPageResponse(questions, result.getTotalElements(), categories,
                result.getTotalPages(), result.getNumber() + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewQuestionResponse> listAll(String category, QuizDifficulty difficulty, String search,
                                                   Boolean active, Long courseId) {
        Specification<InterviewQuestion> spec = buildSpecification(active, category, difficulty, search, courseId, false);
        return interviewQuestionRepository.findAll(spec, Sort.by("category").ascending().and(Sort.by("id").ascending()))
                .stream()
                .map(InterviewQuestionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InterviewQuestionPageResponse pageAll(String category, String difficulty, String search,
                                                 Boolean active, Long courseId, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<InterviewQuestion> spec =
                buildSpecification(active, category, parseDifficulty(difficulty), search, courseId, false);
        Page<InterviewQuestion> result = interviewQuestionRepository.findAll(spec, pageable);
        List<InterviewQuestionResponse> items = result.getContent().stream()
                .map(InterviewQuestionResponse::from)
                .toList();
        return new InterviewQuestionPageResponse(items, result.getTotalElements(), result.getTotalPages(),
                result.getNumber() + 1);
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
                request.getDifficulty(), request.getTags(), request.getCourseId());
        return InterviewQuestionResponse.from(interviewQuestionRepository.save(question));
    }

    @Override
    @Transactional
    public InterviewQuestionResponse update(Long id, UpdateInterviewQuestionRequest request) {
        InterviewQuestion question = findOrThrow(id);
        applyRequest(question, request.getCategory(), request.getQuestionText(), request.getAnswerText(),
                request.getDifficulty(), request.getTags(), request.getCourseId());
        if (request.getActive() != null) {
            question.setActive(request.getActive());
        }
        return InterviewQuestionResponse.from(interviewQuestionRepository.save(question));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        InterviewQuestion question = findOrThrow(id);
        interviewQuestionRepository.delete(question);
    }

    private InterviewQuestion findOrThrow(Long id) {
        return interviewQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Interview question not found: " + id));
    }

private void applyRequest(InterviewQuestion question, String category, String questionText, String answerText,
                           QuizDifficulty difficulty, List<String> tags, Long courseId) {
        question.setCategory(category == null || category.isBlank() ? "General" : category);
        question.setQuestionText(questionText);
        question.setAnswerText(answerText);
        question.setDifficulty(difficulty);
        question.setTags(tags == null || tags.isEmpty() ? null : String.join(",", tags));
        question.setCourse(resolveCourse(courseId));
    }

    private Course resolveCourse(Long courseId) {
        if (courseId == null) {
            return null;
        }
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
    }

    private QuizDifficulty parseDifficulty(String difficulty) {
        if (difficulty == null || difficulty.isBlank()) {
            return null;
        }
        try {
            return QuizDifficulty.valueOf(difficulty.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Invalid difficulty: " + difficulty + ". Valid values: EASY, MEDIUM, HARD");
        }
    }

    private Specification<InterviewQuestion> buildSpecification(Boolean active, String category,
                                                                QuizDifficulty difficulty, String search,
                                                                Long courseId, boolean restrictToCourseId) {
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
            if (restrictToCourseId) {
                if (courseId != null) {
                    predicates.add(cb.or(
                            cb.isNull(root.get("course")),
                            cb.equal(root.get("course").get("id"), courseId)));
                } else {
                    predicates.add(cb.isNull(root.get("course")));
                }
            } else if (courseId != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("course")),
                        cb.equal(root.get("course").get("id"), courseId)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
