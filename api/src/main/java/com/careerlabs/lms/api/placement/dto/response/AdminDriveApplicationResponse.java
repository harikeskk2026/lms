package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.student.entity.Student;

import java.time.Instant;

/** Admin-facing view of a single application within a drive's applicant list. */
public record AdminDriveApplicationResponse(
        Long id,
        Instant appliedAt,
        DriveApplicationStatus status,
        String notes,
        StudentRef student
) {

    public record StudentRef(Long id, UserRef user) {
    }

    public record UserRef(String name, String email) {
    }

    public static AdminDriveApplicationResponse from(DriveApplication application) {
        Student student = application.getStudent();
        return new AdminDriveApplicationResponse(
                application.getId(),
                application.getCreatedAt(),
                application.getStatus(),
                application.getNotes(),
                new StudentRef(student.getId(),
                        new UserRef(student.getUser().getName(), student.getUser().getEmail())));
    }
}
