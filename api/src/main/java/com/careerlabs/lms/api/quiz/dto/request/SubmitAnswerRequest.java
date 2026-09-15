package com.careerlabs.lms.api.quiz.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public class SubmitAnswerRequest {

    @NotNull(message = "Question id is required")
    private Long questionId;

    private List<Long> selectedOptionIds;

    /** Free-text/code/SQL answer for a FREE_TEXT-mode question; null for OPTIONS-mode questions. */
    private String answerText;

    private Integer timeTaken;

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public List<Long> getSelectedOptionIds() {
        return selectedOptionIds;
    }

    public void setSelectedOptionIds(List<Long> selectedOptionIds) {
        this.selectedOptionIds = selectedOptionIds;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    public Integer getTimeTaken() {
        return timeTaken;
    }

    public void setTimeTaken(Integer timeTaken) {
        this.timeTaken = timeTaken;
    }
}
