package com.careerlabs.lms.api.quiz.importer;

import com.careerlabs.lms.api.quiz.dto.request.QuestionOptionRequest;
import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses an admin-authored quiz PDF into draft questions, using a line-based
 * keyword grammar. Supports MCQ, Multiple Correct, True/False, and Short
 * Answer — the options-based types are scored by exact option match; Short
 * Answer is auto-graded via normalized text comparison. (Coding and SQL
 * free-text question types were dropped from this importer — there is no
 * sandboxed execution to grade them, and SQL's original options-based
 * authoring is unaffected and still goes through the Question Bank as before.)
 * The patterns below are intentionally lenient about common real-world
 * variations (bare "1." numbering, "A." vs "A)" options, "Correct Answer:" vs
 * "Answer:", etc.) since a strict single-format match proved too fragile for
 * PDFs authors write by hand. Free-form prose or scanned/image PDFs are still
 * not supported — the admin must format the source PDF with recognizable
 * question/option/answer lines.
 *
 * <pre>
 * Q1                        (also accepts "Q1.", "1.", "1)", "Question 1:" —
 *                            the marker line itself may carry no text at all)
 * Type: MCQ|MULTIPLE_CORRECT|TRUE_FALSE|SHORT_ANSWER
 * Question: &lt;question text&gt;  (or inline on the "Q1. &lt;text&gt;" marker line)
 * Difficulty: EASY|MEDIUM|HARD
 * Points: &lt;integer&gt;
 * Topic: &lt;name&gt;            (optional)
 * Course: &lt;name&gt;           (optional)
 * Options:                  (optional header — ignored, just for readability)
 * A) ...                    (also accepts "A.", "A:", "(A)")
 * B) ...
 * Answer: A[, C]            (also accepts "Correct Answer:", "Correct:", "Ans:")
 * Explanation: &lt;text&gt;
 * </pre>
 */
@Service
public class PdfQuestionExtractor {

    // Group 1 = trailing content when "Q"/"Question" prefixed — may be EMPTY
    // (e.g. a bare "Q1" line on its own, with the actual text supplied later by
    // a separate "Question:" line). Group 2 = content when bare-numbered
    // ("1. text") — requires a space before the text so "3.14" mid-sentence is
    // never mistaken for a question boundary.
    private static final Pattern QUESTION_START = Pattern.compile(
            "^(?:Q(?:uestion)?\\.?\\s*\\d+\\s*[.:)]?\\s*(.*)|\\d+\\s*[.):]\\s+(\\S.*))$", Pattern.CASE_INSENSITIVE);
    private static final Pattern OPTION_LINE = Pattern.compile("^\\(?([A-Za-z])\\)?[.):\\-]\\s*(.+)$");
    private static final Pattern KEYWORD_LINE = Pattern.compile(
            "^(Type|Question Type|Question|Difficulty|Level|Points|Point|Marks|Mark|Topic|Course|"
                    + "Answer|Correct Answer|Correct|Ans|Options?|Choices?|Explanation|Explain)\\s*[:\\-]\\s*(.*)$",
            Pattern.CASE_INSENSITIVE);

    // Some PDFs (or the tools that generated them) run the question number, the
    // "Type:" tag, and the question text together on a single line — e.g.
    // "1. Type: MCQ Which keyword is used to define a function in Python?" —
    // instead of putting "Type:" on its own line. Since Type/Difficulty/Points
    // values are always a single token (no spaces), they can be safely peeled
    // off the front of a line even when text immediately follows on the same
    // line, leaving the real question text behind.
    private static final Pattern INLINE_SIMPLE_KEYWORD = Pattern.compile(
            "^(Type|Question Type|Difficulty|Level|Points|Point|Marks|Mark)\\s*[:\\-]\\s*(\\S+)\\s+(.*)$",
            Pattern.CASE_INSENSITIVE);

    private static final int MAX_DIAGNOSTIC_LINES = 15;
    private static final int MAX_DIAGNOSTIC_LINE_LENGTH = 150;

    public record ExtractionResult(List<ExtractedQuestionDraft> questions, List<String> diagnostics) {
    }

    public ExtractionResult extract(byte[] pdfBytes) throws IOException {
        List<String> lines = extractLines(pdfBytes);
        List<ExtractedQuestionDraft> drafts = new ArrayList<>();

        DraftBuilder current = null;
        for (String rawLine : lines) {
            String trimmed = rawLine.strip();
            Matcher qStart = QUESTION_START.matcher(trimmed);

            if (qStart.matches()) {
                String content = qStart.group(1) != null ? qStart.group(1) : qStart.group(2);
                if (current != null) {
                    current.finish().ifPresent(drafts::add);
                }
                current = new DraftBuilder();
                content = current.consumeInlineKeywords(content.strip());
                if (!content.isBlank()) {
                    current.questionTextLines.add(content);
                }
                continue;
            }

            if (current == null) {
                // Nothing recognized yet (e.g. a title page line before the first question) — ignore.
                continue;
            }

            if (trimmed.isEmpty()) {
                continue;
            }

            Matcher keyword = KEYWORD_LINE.matcher(trimmed);
            Matcher option = OPTION_LINE.matcher(trimmed);

            if (keyword.matches()) {
                current.activeBlock = ActiveBlock.NONE;
                current.applyKeyword(keyword.group(1), keyword.group(2).strip());
            } else if (option.matches() && current.activeBlock == ActiveBlock.NONE) {
                current.options.add(new OptionDraft(option.group(1).toUpperCase(), option.group(2).strip()));
            } else if (current.activeBlock == ActiveBlock.EXPLANATION) {
                current.explanationLines.add(trimmed);
            } else {
                // Unrecognized line with no active block — treat as a question-text
                // continuation, after first peeling off any inline Type:/Difficulty:/
                // Points: prefix that got run together with real question text.
                String remainder = current.consumeInlineKeywords(trimmed);
                if (!remainder.isBlank()) {
                    current.questionTextLines.add(remainder);
                }
            }
        }
        if (current != null) {
            current.finish().ifPresent(drafts::add);
        }

        List<String> diagnostics = drafts.isEmpty() ? buildZeroResultDiagnostics(lines) : List.of();
        return new ExtractionResult(drafts, diagnostics);
    }

    /**
     * When nothing was extracted, tell the admin exactly why instead of a bare
     * "0 questions" — either the PDF has no real text layer (scanned/image PDF,
     * which this importer cannot read), or its text doesn't contain a line this
     * parser recognizes as a question header. Either way, showing the actual
     * extracted lines lets the admin compare them against the expected template.
     */
    private List<String> buildZeroResultDiagnostics(List<String> lines) {
        List<String> diagnostics = new ArrayList<>();
        List<String> nonBlank = lines.stream().map(String::strip).filter(s -> !s.isEmpty()).toList();

        if (nonBlank.isEmpty()) {
            diagnostics.add("The PDF produced no extractable text at all — it may be a scanned/image-based PDF, "
                    + "which this importer cannot read. Re-export it as a text-based PDF (e.g. from Word/Google Docs).");
            return diagnostics;
        }

        diagnostics.add("No question header (e.g. 'Q1.', 'Question 1:', or '1.') was recognized in the extracted text.");
        diagnostics.add("First lines of extracted text, for comparison against the expected template:");
        nonBlank.stream().limit(MAX_DIAGNOSTIC_LINES).forEach(line -> diagnostics.add("  "
                + (line.length() > MAX_DIAGNOSTIC_LINE_LENGTH ? line.substring(0, MAX_DIAGNOSTIC_LINE_LENGTH) + "…" : line)));
        if (nonBlank.size() > MAX_DIAGNOSTIC_LINES) {
            diagnostics.add("  … (" + (nonBlank.size() - MAX_DIAGNOSTIC_LINES) + " more lines not shown)");
        }
        return diagnostics;
    }

    private List<String> extractLines(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(document);
            return List.of(text.split("\\r?\\n"));
        }
    }

    private enum ActiveBlock { NONE, EXPLANATION }

    private record OptionDraft(String letter, String text) {
    }

    private static class DraftBuilder {
        final List<String> questionTextLines = new ArrayList<>();
        final List<OptionDraft> options = new ArrayList<>();
        final List<String> explanationLines = new ArrayList<>();
        final List<String> warnings = new ArrayList<>();

        ActiveBlock activeBlock = ActiveBlock.NONE;
        String typeRaw;
        String difficultyRaw;
        String pointsRaw;
        String topicName;
        String courseName;
        String answerRaw;

        /**
         * Repeatedly peels off any "Type: X" / "Difficulty: X" / "Points: X" prefix
         * found at the start of {@code content}, applying each to this builder, until
         * what's left no longer starts with one — that remainder is the real question
         * (or continuation) text. Handles PDFs that run the tag and the question
         * together on one line instead of putting each field on its own line.
         */
        String consumeInlineKeywords(String content) {
            while (true) {
                Matcher m = INLINE_SIMPLE_KEYWORD.matcher(content);
                if (!m.matches()) {
                    return content;
                }
                applyKeyword(m.group(1), m.group(2).strip());
                content = m.group(3).strip();
            }
        }

        void applyKeyword(String keyword, String value) {
            String normalized = keyword.toLowerCase().replaceAll("\\s+", " ").trim();
            switch (normalized) {
                case "type", "question type" -> typeRaw = value;
                case "question" -> {
                    // A separate "Question: <text>" line — used by templates where
                    // the question number/marker ("Q1") is its own line and the
                    // actual text follows as a labelled field instead of inline.
                    if (!value.isBlank()) {
                        questionTextLines.add(value);
                    }
                }
                case "difficulty", "level" -> difficultyRaw = value;
                case "points", "point", "marks", "mark" -> pointsRaw = value;
                case "topic" -> topicName = value;
                case "course" -> courseName = value;
                case "answer", "correct answer", "correct", "ans" -> answerRaw = value;
                case "options", "option", "choices", "choice" -> {
                    // Just a section header ("Options:") — the lettered option
                    // lines that follow are picked up by OPTION_LINE regardless.
                }
                case "explanation", "explain" -> {
                    activeBlock = ActiveBlock.EXPLANATION;
                    if (!value.isBlank()) {
                        explanationLines.add(value);
                    }
                }
                default -> { /* unreachable given KEYWORD_LINE's capture group */ }
            }
        }

        java.util.Optional<ExtractedQuestionDraft> finish() {
            String questionText = String.join(" ", questionTextLines).strip();
            if (questionText.isEmpty()) {
                return java.util.Optional.empty();
            }

            QuestionType type = parseType(typeRaw, warnings);
            QuizDifficulty difficulty = parseDifficulty(difficultyRaw, warnings);
            int points = parsePoints(pointsRaw, warnings);
            AnswerMode answerMode = type == QuestionType.SHORT_ANSWER ? AnswerMode.FREE_TEXT : AnswerMode.OPTIONS;

            List<QuestionOptionRequest> optionRequests = List.of();
            String correctAnswerText = null;

            if (answerMode == AnswerMode.OPTIONS) {
                optionRequests = buildOptionRequests(warnings);
            } else {
                correctAnswerText = answerRaw == null ? null : answerRaw.strip();
                if (correctAnswerText == null || correctAnswerText.isBlank()) {
                    warnings.add("No 'Answer:' line found for this Short Answer question — set the correct answer manually.");
                }
            }

            String explanation = explanationLines.isEmpty() ? null : String.join(" ", explanationLines).strip();

            return java.util.Optional.of(new ExtractedQuestionDraft(
                    questionText,
                    type,
                    answerMode,
                    difficulty,
                    points,
                    topicName,
                    null,
                    courseName,
                    null,
                    explanation,
                    null,
                    null,
                    optionRequests,
                    correctAnswerText,
                    null,
                    warnings));
        }

        private List<QuestionOptionRequest> buildOptionRequests(List<String> warnings) {
            if (options.isEmpty()) {
                warnings.add("No options (A), B), ...) found for this question — add them manually.");
                return new ArrayList<>();
            }

            List<String> correctLetters = answerRaw == null
                    ? List.of()
                    : java.util.Arrays.stream(answerRaw.toUpperCase().split("[,/]")).map(String::strip).toList();

            List<QuestionOptionRequest> result = new ArrayList<>();
            boolean anyCorrect = false;
            for (OptionDraft opt : options) {
                QuestionOptionRequest req = new QuestionOptionRequest();
                req.setOptionText(opt.text());
                boolean correct = correctLetters.contains(opt.letter());
                req.setCorrect(correct);
                anyCorrect = anyCorrect || correct;
                result.add(req);
            }
            if (!anyCorrect) {
                warnings.add("No correct option marked (check the 'Answer:' line) — defaulted the first option to correct.");
                result.get(0).setCorrect(true);
            }
            return result;
        }

        private static QuestionType parseType(String raw, List<String> warnings) {
            if (raw == null || raw.isBlank()) {
                warnings.add("No 'Type:' line found — defaulted to MCQ.");
                return QuestionType.MCQ;
            }
            try {
                String normalized = raw.strip().toUpperCase()
                        .replace(' ', '_').replace('/', '_').replace('-', '_');
                QuestionType type = QuestionType.valueOf(normalized);
                if (type != QuestionType.MCQ && type != QuestionType.MULTIPLE_CORRECT
                        && type != QuestionType.TRUE_FALSE && type != QuestionType.SHORT_ANSWER) {
                    warnings.add("Question type '" + raw + "' is not supported by the PDF importer "
                            + "(only MCQ, Multiple Correct, True/False, Short Answer) — defaulted to MCQ.");
                    return QuestionType.MCQ;
                }
                return type;
            } catch (IllegalArgumentException e) {
                warnings.add("Unrecognized question type '" + raw + "' — defaulted to MCQ.");
                return QuestionType.MCQ;
            }
        }

        private static QuizDifficulty parseDifficulty(String raw, List<String> warnings) {
            if (raw == null || raw.isBlank()) {
                return QuizDifficulty.MEDIUM;
            }
            try {
                return QuizDifficulty.valueOf(raw.strip().toUpperCase());
            } catch (IllegalArgumentException e) {
                warnings.add("Unrecognized difficulty '" + raw + "' — defaulted to MEDIUM.");
                return QuizDifficulty.MEDIUM;
            }
        }

        private static int parsePoints(String raw, List<String> warnings) {
            if (raw == null || raw.isBlank()) {
                return 1;
            }
            try {
                int points = Integer.parseInt(raw.strip());
                return Math.max(points, 1);
            } catch (NumberFormatException e) {
                warnings.add("Unrecognized points value '" + raw + "' — defaulted to 1.");
                return 1;
            }
        }
    }
}
