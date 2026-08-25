package com.careerlabs.lms.api.course.dto.response;

import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.Level;

import java.time.Instant;

public record CourseResponse(
        Long id,
        String title,
        String slug,
        String description,
        String thumbnail,
        String duration,
        Level level,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static CourseResponse from(Course course) {
        return new CourseResponse(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getDescription(),
                course.getThumbnail(),
                course.getDuration(),
                course.getLevel(),
                course.isActive(),
                course.getCreatedAt(),
                course.getUpdatedAt());
    }
}
