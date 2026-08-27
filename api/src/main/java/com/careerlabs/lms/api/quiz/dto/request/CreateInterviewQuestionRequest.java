package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class CreateInterviewQuestionRequest {

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Question text is required")
    private String questionText;

    @NotBlank(message = "Answer text is required")
    private String answerText;

    @NotNull(message = "Difficulty is required")
    private QuizDifficulty difficulty;

    private List<String> tags;

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    public QuizDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(QuizDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }
}
