package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.validation.QuestionValidationMessages;
import jakarta.validation.constraints.NotBlank;

public class QuestionOptionRequest {

    @NotBlank(message = QuestionValidationMessages.OPTION_TEXT_REQUIRED)
    private String optionText;

    private boolean correct = false;

    public String getOptionText() {
        return optionText;
    }

    public void setOptionText(String optionText) {
        this.optionText = optionText;
    }

    public boolean isCorrect() {
        return correct;
    }

    public void setCorrect(boolean correct) {
        this.correct = correct;
    }
}
