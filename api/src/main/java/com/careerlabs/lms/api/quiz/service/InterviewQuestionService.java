package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewPrepPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewQuestionResponse;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;

import java.util.List;

public interface InterviewQuestionService {

    InterviewPrepPageResponse browse(String category, QuizDifficulty difficulty, String search, int page, int limit);

    List<InterviewQuestionResponse> listAll();

    InterviewQuestionResponse get(Long id);

    InterviewQuestionResponse create(CreateInterviewQuestionRequest request, Long createdBy);

    InterviewQuestionResponse update(Long id, UpdateInterviewQuestionRequest request);

    void deactivate(Long id);
}
