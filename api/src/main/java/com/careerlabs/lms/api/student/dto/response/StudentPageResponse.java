package com.careerlabs.lms.api.student.dto.response;

import java.util.List;

public record StudentPageResponse(
        List<StudentResponse> students,
        long total,
        int page,
        int totalPages
) {
}
