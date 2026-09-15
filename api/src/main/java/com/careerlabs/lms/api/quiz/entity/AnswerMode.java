package com.careerlabs.lms.api.quiz.entity;

/**
 * How a {@link Question} is answered and graded. {@code OPTIONS} is the original,
 * default mode (MCQ-style, scored by matching selected {@link QuestionOption}s) and
 * covers every question created before this enum existed. {@code FREE_TEXT} is used
 * for Short Answer (auto-graded by normalized text comparison) and for Coding/SQL
 * questions authored as a free-form code/query answer (captured but never graded,
 * since no sandboxed execution exists) — see {@code QuizScoringServiceImpl}.
 */
public enum AnswerMode {
    OPTIONS,
    FREE_TEXT
}
