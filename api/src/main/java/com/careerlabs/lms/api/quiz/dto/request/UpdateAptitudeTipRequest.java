package com.careerlabs.lms.api.quiz.dto.request;

import jakarta.validation.constraints.NotBlank;

public class UpdateAptitudeTipRequest {

    @NotBlank(message = "Topic is required")
    private String topic;

    @NotBlank(message = "Formula is required")
    private String formula;

    @NotBlank(message = "Example is required")
    private String example;

    private Boolean active;

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getFormula() {
        return formula;
    }

    public void setFormula(String formula) {
        this.formula = formula;
    }

    public String getExample() {
        return example;
    }

    public void setExample(String example) {
        this.example = example;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}