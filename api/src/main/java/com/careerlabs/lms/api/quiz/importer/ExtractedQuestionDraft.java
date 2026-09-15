package com.careerlabs.lms.api.quiz.importer;

import com.careerlabs.lms.api.quiz.dto.request.QuestionOptionRequest;
import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;

import java.util.List;

/**
 * One question parsed out of an admin-uploaded PDF, not yet persisted. Returned
 * by the preview endpoint so the admin can edit/delete/add/reorder before any
 * {@code Question} row is created — see {@code QuizPdfImportController}.
 */
public record ExtractedQuestionDraft(
        String questionText,
        QuestionType questionType,
        AnswerMode answerMode,
        QuizDifficulty difficulty,
        Integer points,
        String topicName,
        Long resolvedTopicId,
        String courseName,
        Long resolvedCourseId,
        String explanation,
        String codeSnippet,
        String answerLanguage,
        List<QuestionOptionRequest> options,
        String correctAnswerText,
        String referenceAnswer,
        List<String> warnings
) {
}
