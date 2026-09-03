package com.careerlabs.lms.api.placement.dto.request;

import jakarta.validation.constraints.NotBlank;

public record StudentSkillRequest(
    @NotBlank String name,
    Integer level,
    String category
) {}
