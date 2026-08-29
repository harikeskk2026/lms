package com.careerlabs.lms.api.student.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.user.entity.User;

import java.time.Instant;
import java.time.LocalDate;

public record StudentResponse(
        Long id,
        String name,
        String email,
        String phone,
        boolean active,
        String enrollmentNo,
        String address,
        String qualification,
        String linkedinUrl,
        String githubUrl,
        String resumeUrl,
        PlacementStatus placementStatus,
        BatchSummary batch,
        CollegeSummary college,
        CourseSummary course,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt
) {

    public static StudentResponse from(Student student) {
        User user = student.getUser();
        Batch batch = student.getBatch();
        College college = student.getCollege();
        Course course = student.getCourse();

        return new StudentResponse(
                student.getId(),
                user.getName(),
                user.getEmail(),
                student.getPhone(),
                user.isActive(),
                student.getEnrollmentNo(),
                student.getAddress(),
                student.getQualification(),
                student.getLinkedinUrl(),
                student.getGithubUrl(),
                student.getResumeUrl(),
                student.getPlacementStatus(),
                batch != null ? BatchSummary.from(batch) : null,
                college != null ? new CollegeSummary(college.getId(), college.getName()) : null,
                course != null ? new CourseSummary(course.getId(), course.getTitle()) : null,
                user.getLastLoginAt(),
                student.getCreatedAt(),
                student.getUpdatedAt());
    }

    public record BatchSummary(
            Long id,
            String name,
            String timing,
            BatchMode mode,
            LocalDate startDate,
            LocalDate endDate,
            CourseSummary course
    ) {
        public static BatchSummary from(Batch batch) {
            return new BatchSummary(
                    batch.getId(),
                    batch.getName(),
                    batch.getTiming(),
                    batch.getMode(),
                    batch.getStartDate(),
                    batch.getEndDate(),
                    new CourseSummary(batch.getCourse().getId(), batch.getCourse().getTitle()));
        }
    }

    public record CourseSummary(Long id, String title) {
    }

    public record CollegeSummary(Long id, String name) {
    }
}
