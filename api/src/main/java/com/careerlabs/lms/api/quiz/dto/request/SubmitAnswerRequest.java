package com.careerlabs.lms.api.quiz.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public class SubmitAnswerRequest {

    @NotNull(message = "Question id is required")
    private Long questionId;

    private List<Long> selectedOptionIds;

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

    public Integer getTimeTaken() {
        return timeTaken;
    }

    public void setTimeTaken(Integer timeTaken) {
        this.timeTaken = timeTaken;
    }
}
