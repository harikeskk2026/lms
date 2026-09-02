package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.SubmitAnswerRequest;
import com.careerlabs.lms.api.quiz.dto.response.QuizAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResultResponse;
import com.careerlabs.lms.api.quiz.dto.response.StartAttemptResponse;

import java.util.List;

public interface QuizAttemptService {

    StartAttemptResponse start(Long quizId, Long studentId);

    void saveAnswer(Long attemptId, Long studentId, SubmitAnswerRequest request);

    QuizResultResponse submit(Long attemptId, Long studentId);

    QuizResultResponse get(Long attemptId, Long studentId);

    List<QuizAttemptResponse> listMine(Long studentId);
}
