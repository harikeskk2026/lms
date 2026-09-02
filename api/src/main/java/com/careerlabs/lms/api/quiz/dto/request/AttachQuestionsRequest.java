package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.validation.QuizValidationMessages;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class AttachQuestionsRequest {

    @NotEmpty(message = QuizValidationMessages.QUESTION_IDS_REQUIRED)
    private List<Long> questionIds;

    public List<Long> getQuestionIds() {
        return questionIds;
    }

    public void setQuestionIds(List<Long> questionIds) {
        this.questionIds = questionIds;
    }
}
