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

    /** Marks an IN_PROGRESS attempt as abandoned (INCOMPLETE) - the student exited
     *  or closed the quiz before submitting. Idempotent: a no-op if the attempt is
     *  already SUBMITTED or INCOMPLETE, so it's safe to call from a fire-and-forget
     *  beacon on page unload without risking a race against a real submit. */
    void abandon(Long attemptId, Long studentId);
}
