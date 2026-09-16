package com.careerlabs.lms.api.student.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;

import java.time.Instant;
import java.time.LocalDate;

public record StudentCourseResponse(
        Long id,
        Long courseId,
        Long batchId,
        Instant enrolledAt,
        CourseInfo course,
        BatchInfo batch,
        ProgressInfo progress
) {
    public record CourseInfo(
            Long id,
            String title,
            String description,
            String duration,
            String level,
            String thumbnail
    ) {
        public static CourseInfo from(Course c) {
            if (c == null) return null;
            return new CourseInfo(
                    c.getId(),
                    c.getTitle(),
                    c.getDescription(),
                    c.getDuration(),
                    c.getLevel() != null ? c.getLevel().name() : "BEGINNER",
                    c.getThumbnail()
            );
        }
    }

    public record BatchInfo(
            Long id,
            String name,
            String mode,
            String timing,
            LocalDate startDate,
            LocalDate endDate
    ) {
        public static BatchInfo from(Batch b) {
            if (b == null) return null;
            return new BatchInfo(
                    b.getId(),
                    b.getName(),
                    b.getMode() != null ? b.getMode().name() : "HYBRID",
                    b.getTiming(),
                    b.getStartDate(),
                    b.getEndDate()
            );
        }
    }

    public record ProgressInfo(
            int completed,
            int total,
            int pct
    ) {}

    public static StudentCourseResponse of(Enrollment enrollment, Batch batch, Course course, int completedTopics, int totalTopics) {
        int pct = totalTopics > 0 ? (int) Math.round(((double) completedTopics / totalTopics) * 100) : 0;
        return new StudentCourseResponse(
                enrollment != null ? enrollment.getId() : null,
                course != null ? course.getId() : null,
                batch != null ? batch.getId() : null,
                enrollment != null ? enrollment.getEnrolledAt() : null,
                CourseInfo.from(course),
                BatchInfo.from(batch),
                new ProgressInfo(completedTopics, totalTopics, pct)
        );
    }

    public static StudentCourseResponse of(Batch batch, Course course, int completedTopics, int totalTopics) {
        return of(null, batch, course, completedTopics, totalTopics);
    }
}

