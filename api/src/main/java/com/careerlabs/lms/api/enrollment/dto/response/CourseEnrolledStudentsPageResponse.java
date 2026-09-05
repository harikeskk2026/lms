package com.careerlabs.lms.api.enrollment.dto.response;

import java.util.List;

public record CourseEnrolledStudentsPageResponse(
        List<CourseEnrolledStudentResponse> enrollments,
        long total,
        int page,
        int totalPages
) {
}
