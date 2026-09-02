package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.CreateQuizTopicRequest;
import com.careerlabs.lms.api.quiz.dto.response.QuizTopicResponse;

import java.util.List;

public interface QuizTopicService {

    List<QuizTopicResponse> list();

    QuizTopicResponse create(CreateQuizTopicRequest request);
}
