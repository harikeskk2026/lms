package com.careerlabs.lms.api.quiz.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ReorderQuestionsRequest {

    @Valid
    @NotEmpty(message = "At least one question is required")
    private List<Item> items;

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
    }

    /**
     * List order = new orderIndex. {@code marks} is optional — null keeps
     * whatever override (or lack of one) that question already had.
     */
    public static class Item {

        @NotNull(message = "Question id is required")
        private Long questionId;

        private Integer marks;

        public Long getQuestionId() {
            return questionId;
        }

        public void setQuestionId(Long questionId) {
            this.questionId = questionId;
        }

        public Integer getMarks() {
            return marks;
        }

        public void setMarks(Integer marks) {
            this.marks = marks;
        }
    }
}
