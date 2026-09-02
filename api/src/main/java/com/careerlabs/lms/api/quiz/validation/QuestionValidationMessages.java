package com.careerlabs.lms.api.quiz.validation;

public final class QuestionValidationMessages {

    public static final String TEXT_REQUIRED = "Question text is required";
    public static final String TYPE_REQUIRED = "Question type is required";
    public static final String DIFFICULTY_REQUIRED = "Difficulty is required";
    public static final String POINTS_REQUIRED = "Points is required";
    public static final String POINTS_MIN = "Points must be at least {value}";
    public static final String OPTIONS_REQUIRED = "At least one option is required";
    public static final String OPTION_TEXT_REQUIRED = "Option text is required";
    public static final String OPTIONS_INVALID_MCQ =
            "MCQ and TRUE_FALSE questions must have exactly one correct option";
    public static final String OPTIONS_INVALID_MULTI =
            "MULTIPLE_CORRECT questions must have at least one correct option";

    private QuestionValidationMessages() {
    }
}
