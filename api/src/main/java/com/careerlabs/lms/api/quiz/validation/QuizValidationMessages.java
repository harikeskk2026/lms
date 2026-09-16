package com.careerlabs.lms.api.quiz.validation;

public final class QuizValidationMessages {

    public static final String TITLE_REQUIRED = "Title is required";
    public static final String TITLE_SIZE = "Title must be between {min} and {max} characters";
    public static final String DIFFICULTY_REQUIRED = "Difficulty is required";
    public static final String DURATION_REQUIRED = "Duration is required";
    public static final String DURATION_MIN = "Duration must be at least {value} minute";
    public static final String DURATION_MAX = "Duration cannot exceed {value} minutes";
    public static final String PASSING_SCORE_REQUIRED = "Passing score is required";
    public static final String PASSING_SCORE_RANGE = "Passing score must be between {value} and 100";
    public static final String MAX_ATTEMPTS_REQUIRED = "Maximum attempts is required";
    public static final String MAX_ATTEMPTS_MIN = "Maximum attempts must be at least {value}";
    public static final String MAX_ATTEMPTS_MAX = "Maximum attempts cannot exceed {value}";
    public static final String QUESTION_IDS_REQUIRED = "At least one question must be selected";

    private QuizValidationMessages() {
    }
}
