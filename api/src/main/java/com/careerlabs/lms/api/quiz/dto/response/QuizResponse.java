package com.careerlabs.lms.api.quiz.dto.response;

import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizEffectiveStatus;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.entity.ResultVisibility;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record QuizResponse(
        Long id,
        String title,
        String description,
        QuizType type,
        QuizDifficulty difficulty,
        Integer duration,
        Integer passingScore,
        Integer maxAttempts,
        Long courseId,
        String courseName,
        Long batchId,
        String batchName,
        boolean randomQuestions,
        boolean randomOptions,
        boolean showExplanation,
        boolean negativeMarking,
        ResultVisibility resultVisibility,
        boolean resultsReleased,
        LocalDateTime scheduledStart,
        LocalDateTime scheduledEnd,
        QuizStatus status,
        QuizEffectiveStatus effectiveStatus,
        Long createdBy,
        int totalQuestions,
        List<QuestionResponse> questions,
        List<QuizAssignmentResponse> assignments,
        boolean hasSourcePdf,
        Instant createdAt,
        Instant updatedAt
) {

    public static QuizResponse from(Quiz quiz, List<QuestionResponse> questions, String courseName, String batchName,
                                     QuizEffectiveStatus effectiveStatus, List<QuizAssignmentResponse> assignments) {
        return from(quiz, questions, courseName, batchName, effectiveStatus, assignments, false);
    }

    /** {@code hasSourcePdf} is admin-view only — whether this quiz was authored via the PDF-import flow. */
    public static QuizResponse from(Quiz quiz, List<QuestionResponse> questions, String courseName, String batchName,
                                     QuizEffectiveStatus effectiveStatus, List<QuizAssignmentResponse> assignments,
                                     boolean hasSourcePdf) {
        return new QuizResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getType(),
                quiz.getDifficulty(),
                quiz.getDuration(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.getCourseId(),
                courseName,
                quiz.getBatchId(),
                batchName,
                quiz.isRandomQuestions(),
                quiz.isRandomOptions(),
                quiz.isShowExplanation(),
                quiz.isNegativeMarking(),
                quiz.getResultVisibility(),
                quiz.isResultsReleased(),
                quiz.getScheduledStart(),
                quiz.getScheduledEnd(),
                quiz.getStatus(),
                effectiveStatus,
                quiz.getCreatedBy(),
                questions.size(),
                questions,
                assignments,
                hasSourcePdf,
                quiz.getCreatedAt(),
                quiz.getUpdatedAt());
    }
}
