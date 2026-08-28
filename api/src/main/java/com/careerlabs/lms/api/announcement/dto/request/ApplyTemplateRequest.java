package com.careerlabs.lms.api.announcement.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record ApplyTemplateRequest(
        @NotNull(message = "templateId is required")
        Long templateId,

        /** e.g. {"batchName": "2026-A", "courseName": "Java Programming"}. Missing keys are left unresolved. */
        Map<String, String> variables
) {
}
