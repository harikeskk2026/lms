package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;

import java.time.Instant;
import java.util.List;

/**
 * Full attempt detail — used both to resume an IN_PROGRESS attempt (in which case every
 * answer-key field in {@link QuestionReviewItem} is null) and to show a SUBMITTED result
 * (in which case they're populated, gated by the quiz's {@code showExplanation} flag).
 */
public record QuizResultResponse(
        Long attemptId,
        Long quizId,
        String quizTitle,
        AttemptStatus status,
        int attemptNumber,
        Integer score,
        Integer totalScore,
        Double accuracy,
        int correctCount,
        int wrongCount,
        int skippedCount,
        Integer timeTaken,
        Instant startedAt,
        Instant completedAt,
        Boolean passed,
        boolean resultsPending,
        List<QuestionReviewItem> review
) {

    public static QuizResultResponse from(QuizAttempt attempt, List<QuestionAttempt> questionAttempts,
                                           boolean showExplanation) {
        return from(attempt, questionAttempts, showExplanation, false);
    }

    /**
     * @param resultsPending when true (the quiz's result-visibility rule hasn't
     *                       released this attempt's outcome yet), every answer-key
     *                       and scoring field is nulled out — the student only
     *                       learns that their attempt was recorded, not how it went.
     */
    public static QuizResultResponse from(QuizAttempt attempt, List<QuestionAttempt> questionAttempts,
                                           boolean showExplanation, boolean resultsPending) {
        boolean submitted = attempt.getStatus() == AttemptStatus.SUBMITTED;
        boolean revealScoring = submitted && !resultsPending;

        List<QuestionReviewItem> review = questionAttempts.stream()
                .map(qa -> toReviewItem(qa, revealScoring, showExplanation))
                .toList();

        return new QuizResultResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getQuiz().getTitle(),
                attempt.getStatus(),
                attempt.getAttemptNumber(),
                revealScoring ? attempt.getScore() : null,
                attempt.getTotalScore(),
                revealScoring ? attempt.getAccuracy() : null,
                revealScoring ? attempt.getCorrectCount() : 0,
                revealScoring ? attempt.getWrongCount() : 0,
                revealScoring ? attempt.getSkippedCount() : 0,
                attempt.getTimeTaken(),
                attempt.getStartedAt(),
                attempt.getCompletedAt(),
                revealScoring ? attempt.getPassed() : null,
                submitted && resultsPending,
                review);
    }

    private static QuestionReviewItem toReviewItem(QuestionAttempt qa, boolean submitted, boolean showExplanation) {
        List<String> yourAnswers = qa.getSelectedOptions().stream().map(QuestionOption::getOptionText).toList();

        List<String> correctAnswers = submitted
                ? qa.getQuestion().getOptions().stream()
                        .filter(QuestionOption::isCorrect)
                        .map(QuestionOption::getOptionText)
                        .toList()
                : null;

        return new QuestionReviewItem(
                qa.getQuestion().getId(),
                qa.getQuestion().getQuestionText(),
                qa.getQuestion().getQuestionType(),
                qa.getQuestion().getTopic() != null ? qa.getQuestion().getTopic().getName() : null,
                yourAnswers,
                correctAnswers,
                submitted ? qa.getCorrect() : null,
                submitted && showExplanation ? qa.getQuestion().getExplanation() : null,
                qa.getPointsEarned(),
                qa.getQuestion().getPoints());
    }

    public record QuestionReviewItem(
            Long questionId,
            String questionText,
            com.careerlabs.lms.api.quiz.entity.QuestionType questionType,
            String topicName,
            List<String> yourAnswers,
            List<String> correctAnswers,
            Boolean correct,
            String explanation,
            int pointsEarned,
            Integer points
    ) {
    }
}
