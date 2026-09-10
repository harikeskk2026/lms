package com.careerlabs.lms.api.placement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePreparationMaterialRequest(
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be 255 characters or less")
    String title,
    @Size(max = 100, message = "Interview type must be 100 characters or less")
    String interviewType,
    String instructions,
    Long courseId
) {}