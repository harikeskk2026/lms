package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.QuizAttempt;

import java.time.Instant;
import java.util.List;

public record StartAttemptResponse(
        Long attemptId,
        Long quizId,
        String title,
        Integer duration,
        Integer passingScore,
        int totalQuestions,
        int attemptNumber,
        Instant startedAt,
        List<StudentQuestionResponse> questions
) {

    public static StartAttemptResponse from(QuizAttempt attempt, List<StudentQuestionResponse> questions) {
        return new StartAttemptResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getQuiz().getTitle(),
                attempt.getQuiz().getDuration(),
                attempt.getQuiz().getPassingScore(),
                questions.size(),
                attempt.getAttemptNumber(),
                attempt.getStartedAt(),
                questions);
    }
}
