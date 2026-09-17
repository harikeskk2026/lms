package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.CreateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuestionAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuestionPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuestionResponse;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;

import java.util.List;

public interface QuestionService {

    List<QuestionResponse> search(Long topicId, Long courseId, QuizDifficulty difficulty, QuestionType questionType,
                                   Boolean active, String search);

    /** Same filters as {@link #search(Long, Long, QuizDifficulty, QuestionType, Boolean, String)}, but paginated
     * (1-indexed {@code page}) - used only when the caller explicitly opts in with page/limit. */
    QuestionPageResponse search(Long topicId, Long courseId, QuizDifficulty difficulty, QuestionType questionType,
                                 Boolean active, String search, int page, int limit);

    QuestionResponse get(Long id);

    QuestionResponse create(CreateQuestionRequest request, Long createdBy);

    QuestionResponse update(Long id, UpdateQuestionRequest request);

    void deactivate(Long id);

    void delete(Long id);

    QuestionResponse duplicate(Long id);

    AdminQuestionAnalyticsResponse getAnalytics(Long id);
}
