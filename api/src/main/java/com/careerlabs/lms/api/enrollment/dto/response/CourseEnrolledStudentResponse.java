package com.careerlabs.lms.api.enrollment.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.student.dto.response.StudentResponse.BatchSummary;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.user.entity.User;

import java.time.Instant;

public record CourseEnrolledStudentResponse(
        Long enrollmentId,
        Long studentId,
        String name,
        String email,
        String phone,
        String enrollmentNo,
        boolean active,
        boolean userActive,
        BatchSummary batch,
        PlacementStatus placementStatus,
        Instant enrolledAt
) {

    public static CourseEnrolledStudentResponse from(Enrollment enrollment) {
        Student student = enrollment.getStudent();
        User user = student != null ? student.getUser() : null;
        Batch batch = enrollment.getBatch();

        return new CourseEnrolledStudentResponse(
                enrollment.getId(),
                student != null ? student.getId() : null,
                user != null ? user.getName() : null,
                user != null ? user.getEmail() : null,
                student != null ? student.getPhone() : null,
                student != null ? student.getEnrollmentNo() : null,
                enrollment.isActive(),
                user != null && user.isActive(),
                batch != null ? BatchSummary.from(batch) : null,
                student != null ? student.getPlacementStatus() : null,
                enrollment.getEnrolledAt()
        );
    }
}
