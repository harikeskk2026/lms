package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class UpdateInterviewQuestionRequest {

    private String category;

    @NotBlank(message = "Question text is required")
    @JsonAlias({"questionText", "question"})
    @JsonProperty("questionText")
    private String questionText;

    @NotBlank(message = "Answer text is required")
    @JsonAlias({"answerText", "answer"})
    @JsonProperty("answerText")
    private String answerText;

    @NotNull(message = "Difficulty is required")
    private QuizDifficulty difficulty;

    private List<String> tags;

    private Boolean active;

    private Long courseId;

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

    @JsonSetter("question")
    public void setQuestion(String question) {
        this.questionText = question;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    @JsonSetter("answer")
    public void setAnswer(String answer) {
        this.answerText = answer;
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

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }
}
