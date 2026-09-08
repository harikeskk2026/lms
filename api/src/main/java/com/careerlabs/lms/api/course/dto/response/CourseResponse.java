package com.careerlabs.lms.api.course.dto.response;

import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;

import java.time.Instant;

public record CourseResponse(
        Long id,
        String title,
        String slug,
        String courseCode,
        String description,
        String thumbnail,
        String duration,
        Level level,
        CourseStatus status,
        boolean active,
        boolean enrolled,
        Instant createdAt,
        Instant updatedAt
) {

    public static CourseResponse from(Course course) {
        return from(course, false);
    }

    public static CourseResponse from(Course course, boolean enrolled) {
        return new CourseResponse(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getCourseCode(),
                course.getDescription(),
                course.getThumbnail(),
                course.getDuration(),
                course.getLevel(),
                course.getStatus(),
                course.isActive(),
                enrolled,
                course.getCreatedAt(),
                course.getUpdatedAt());
    }
}
