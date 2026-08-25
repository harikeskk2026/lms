package com.careerlabs.lms.api.college.dto.response;

import com.careerlabs.lms.api.college.entity.College;

import java.time.Instant;
import java.util.List;

public record CollegeResponse(
        Long id,
        String name,
        boolean active,
        List<CourseSummary> courses,
        Instant createdAt,
        Instant updatedAt
) {

    public static CollegeResponse from(College college) {
        return new CollegeResponse(
                college.getId(),
                college.getName(),
                college.isActive(),
                college.getCourses().stream()
                        .map(course -> new CourseSummary(course.getId(), course.getTitle()))
                        .toList(),
                college.getCreatedAt(),
                college.getUpdatedAt());
    }

    public record CourseSummary(Long id, String title) {
    }
}
