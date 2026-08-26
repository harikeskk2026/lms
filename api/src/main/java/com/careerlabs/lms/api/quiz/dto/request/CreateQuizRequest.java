package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.validation.QuizValidationMessages;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateQuizRequest {

    @NotBlank(message = QuizValidationMessages.TITLE_REQUIRED)
    @Size(min = 3, max = 150, message = QuizValidationMessages.TITLE_SIZE)
    private String title;

    private String description;

    @NotNull(message = "Type is required")
    private QuizType type = QuizType.MCQ;

    @NotNull(message = QuizValidationMessages.DIFFICULTY_REQUIRED)
    private QuizDifficulty difficulty;

    @NotNull(message = QuizValidationMessages.DURATION_REQUIRED)
    @Min(value = 1, message = QuizValidationMessages.DURATION_MIN)
    private Integer duration;

    @NotNull(message = QuizValidationMessages.PASSING_SCORE_REQUIRED)
    @Min(value = 0, message = QuizValidationMessages.PASSING_SCORE_RANGE)
    @Max(value = 100, message = QuizValidationMessages.PASSING_SCORE_RANGE)
    private Integer passingScore;

    @NotNull(message = QuizValidationMessages.MAX_ATTEMPTS_REQUIRED)
    @Min(value = 1, message = QuizValidationMessages.MAX_ATTEMPTS_MIN)
    private Integer maxAttempts = 1;

    private boolean randomQuestions = false;

    private boolean randomOptions = false;

    private boolean showExplanation = true;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public QuizType getType() {
        return type;
    }

    public void setType(QuizType type) {
        this.type = type;
    }

    public QuizDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(QuizDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Integer getPassingScore() {
        return passingScore;
    }

    public void setPassingScore(Integer passingScore) {
        this.passingScore = passingScore;
    }

    public Integer getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public boolean isRandomQuestions() {
        return randomQuestions;
    }

    public void setRandomQuestions(boolean randomQuestions) {
        this.randomQuestions = randomQuestions;
    }

    public boolean isRandomOptions() {
        return randomOptions;
    }

    public void setRandomOptions(boolean randomOptions) {
        this.randomOptions = randomOptions;
    }

    public boolean isShowExplanation() {
        return showExplanation;
    }

    public void setShowExplanation(boolean showExplanation) {
        this.showExplanation = showExplanation;
    }
}
