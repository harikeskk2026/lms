package com.careerlabs.lms.api.enrollment.dto.response;

import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;

import java.time.Instant;

public record EnrollmentResponse(
        Long id,
        CourseResponse course,
        Instant enrolledAt
) {

    public static EnrollmentResponse from(Enrollment enrollment) {
        return new EnrollmentResponse(
                enrollment.getId(),
                CourseResponse.from(enrollment.getCourse(), true),
                enrollment.getEnrolledAt());
    }
}
