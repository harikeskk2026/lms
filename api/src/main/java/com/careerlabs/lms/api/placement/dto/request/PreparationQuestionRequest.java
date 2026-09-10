package com.careerlabs.lms.api.placement.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PreparationQuestionRequest(
    @NotBlank(message = "Question is required")
    String questionText,
    String answerText,
    Integer sortOrder
) {}