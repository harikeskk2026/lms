package com.careerlabs.lms.api.quiz.importer;

import java.util.List;

/** Result of parsing an uploaded quiz PDF — nothing in here has been persisted. */
public record PdfQuizExtractionResponse(
        List<ExtractedQuestionDraft> questions,
        int totalExtracted,
        List<String> globalWarnings
) {
}
