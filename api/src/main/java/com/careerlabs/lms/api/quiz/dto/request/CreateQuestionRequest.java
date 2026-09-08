package com.careerlabs.lms.api.quiz.dto.request;

import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.validation.QuestionOptionsAware;
import com.careerlabs.lms.api.quiz.validation.QuestionValidationMessages;
import com.careerlabs.lms.api.quiz.validation.annotation.ValidQuestionOptions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@ValidQuestionOptions
public class CreateQuestionRequest implements QuestionOptionsAware {

    private Long topicId;
    @NotNull(message = QuestionValidationMessages.COURSE_REQUIRED)
    private Long courseId;

    @NotBlank(message = QuestionValidationMessages.TEXT_REQUIRED)
    private String questionText;

    @NotNull(message = QuestionValidationMessages.TYPE_REQUIRED)
    private QuestionType questionType;

    @NotNull(message = QuestionValidationMessages.DIFFICULTY_REQUIRED)
    private QuizDifficulty difficulty;

    private String explanation;

    private String codeSnippet;

    @NotNull(message = QuestionValidationMessages.POINTS_REQUIRED)
    @Min(value = 1, message = QuestionValidationMessages.POINTS_MIN)
    private Integer points;

    @NotEmpty(message = QuestionValidationMessages.OPTIONS_REQUIRED)
    @Valid
    private List<QuestionOptionRequest> options;

    public Long getTopicId() {
        return topicId;
    }

    public void setTopicId(Long topicId) {
        this.topicId = topicId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    @Override
    public QuestionType getQuestionType() {
        return questionType;
    }

    public void setQuestionType(QuestionType questionType) {
        this.questionType = questionType;
    }

    public QuizDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(QuizDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getCodeSnippet() {
        return codeSnippet;
    }

    public void setCodeSnippet(String codeSnippet) {
        this.codeSnippet = codeSnippet;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    @Override
    public List<QuestionOptionRequest> getOptions() {
        return options;
    }

    public void setOptions(List<QuestionOptionRequest> options) {
        this.options = options;
    }
}
