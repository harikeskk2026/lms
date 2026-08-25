package com.careerlabs.lms.api.student.dto.response;

public record StudentCountResponse(
        long total,
        long active,
        long inactive
) {
}
