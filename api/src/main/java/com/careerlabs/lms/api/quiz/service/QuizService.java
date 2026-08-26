package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.AttachQuestionsRequest;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateQuizRequest;
import com.careerlabs.lms.api.quiz.dto.response.AdminQuizAnalyticsResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuizResponse;

import java.util.List;

public interface QuizService {

    List<QuizResponse> list();

    QuizResponse get(Long id);

    QuizResponse create(CreateQuizRequest request, Long createdBy);

    QuizResponse update(Long id, UpdateQuizRequest request);

    void delete(Long id);

    QuizResponse attachQuestions(Long quizId, AttachQuestionsRequest request);

    QuizResponse detachQuestion(Long quizId, Long questionId);

    List<StudentQuizResponse> listPublished(Long studentId);

    StudentQuizResponse getPublished(Long id, Long studentId);

    AdminQuizAnalyticsResponse getAnalytics(Long id);
}
