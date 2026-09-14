package com.careerlabs.lms.api.student.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.user.entity.User;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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
        List<BatchSummary> batches,
        CollegeSummary college,
        CourseSummary course,
        List<CourseSummary> courses,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt
) {

    public static StudentResponse from(Student student) {
        return from(student, List.of());
    }

    public static StudentResponse from(Student student, List<Enrollment> enrollments) {
        User user = student.getUser();
        College college = student.getCollege();

        List<BatchSummary> batchSummaries = new ArrayList<>();
        List<CourseSummary> courseSummaries = new ArrayList<>();

        if (enrollments != null) {
            for (Enrollment e : enrollments) {
                if (e.isActive()) {
                    if (e.getBatch() != null) {
                        batchSummaries.add(BatchSummary.from(e.getBatch()));
                    }
                    if (e.getCourse() != null) {
                        Course c = e.getCourse();
                        if (courseSummaries.stream().noneMatch(cs -> cs.id().equals(c.getId()))) {
                            courseSummaries.add(new CourseSummary(c.getId(), c.getTitle()));
                        }
                    }
                }
            }
        }

        CourseSummary fallbackCourse = !courseSummaries.isEmpty()
                ? courseSummaries.get(0)
                : (student.getCourse() != null ? new CourseSummary(student.getCourse().getId(), student.getCourse().getTitle()) : null);

        return new StudentResponse(
                student.getId(),
                user != null ? user.getName() : null,
                user != null ? user.getEmail() : null,
                student.getPhone(),
                user != null && user.isActive(),
                student.getEnrollmentNo(),
                student.getAddress(),
                student.getQualification(),
                student.getLinkedinUrl(),
                student.getGithubUrl(),
                student.getResumeUrl(),
                student.getPlacementStatus(),
                batchSummaries,
                college != null ? new CollegeSummary(college.getId(), college.getName()) : null,
                fallbackCourse,
                courseSummaries,
                user != null ? user.getLastLoginAt() : null,
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
