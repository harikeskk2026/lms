package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.AssignQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.AttachQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.ReorderQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizAssignmentResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;
import com.careerlabs.lms.api.quiz.entity.QuizType;

import java.util.List;

public interface QuizService {

    /** Server-driven, paginated admin quiz list. {@code status} takes the effective-status values the UI
     * shows (DRAFT/SCHEDULED/LIVE/COMPLETED/ARCHIVED) and {@code sourcePdf} narrows to quizzes authored
     * from an uploaded PDF. {@code page} is 1-indexed. */
    QuizPageResponse list(String search, QuizType type, Long courseId, Long batchId, String status,
                          Boolean sourcePdf, int page, int limit);

    QuizResponse get(Long id);

    QuizResponse create(CreateQuizRequest request, Long createdBy);

    QuizResponse update(Long id, UpdateQuizRequest request);

    void delete(Long id);

    QuizResponse attachQuestions(Long quizId, AttachQuestionsRequest request);

    QuizResponse detachQuestion(Long quizId, Long questionId);

    QuizResponse reorderQuestions(Long quizId, ReorderQuestionsRequest request);

    List<StudentQuizResponse> listPublished(Long studentId);

    /** Student quiz list with optional case-insensitive search over title/description. */
    List<StudentQuizResponse> listPublished(Long studentId, String search);

    StudentQuizResponse getPublished(Long id, Long studentId);

    AdminQuizAnalyticsResponse getAnalytics(Long id);

    List<QuizAssignmentResponse> assign(Long quizId, AssignQuizRequest request, Long assignedBy);

    List<QuizAssignmentResponse> getAssignments(Long quizId);

    void removeAssignment(Long quizId, Long assignmentId);

    QuizResponse releaseResults(Long quizId);
}
