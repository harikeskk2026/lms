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
        List<QuestionReviewItem> review
) {

    public static QuizResultResponse from(QuizAttempt attempt, List<QuestionAttempt> questionAttempts,
                                           boolean showExplanation) {
        boolean submitted = attempt.getStatus() == AttemptStatus.SUBMITTED;

        List<QuestionReviewItem> review = questionAttempts.stream()
                .map(qa -> toReviewItem(qa, submitted, showExplanation))
                .toList();

        return new QuizResultResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getQuiz().getTitle(),
                attempt.getStatus(),
                attempt.getAttemptNumber(),
                attempt.getScore(),
                attempt.getTotalScore(),
                attempt.getAccuracy(),
                attempt.getCorrectCount(),
                attempt.getWrongCount(),
                attempt.getSkippedCount(),
                attempt.getTimeTaken(),
                attempt.getStartedAt(),
                attempt.getCompletedAt(),
                attempt.getPassed(),
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
