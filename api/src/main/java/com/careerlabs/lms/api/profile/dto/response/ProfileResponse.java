package com.careerlabs.lms.api.profile.dto.response;

import com.careerlabs.lms.api.user.entity.Role;

import java.time.Instant;
import java.util.List;

/**
 * Unified "My Profile" view for every role. {@code student} is populated only for
 * STUDENT accounts; {@code admin} only for SUPERADMIN/ADMIN/TRAINER accounts (the
 * other is always null) - see ProfileServiceImpl.
 */
public record ProfileResponse(
        Long id,
        String name,
        String email,
        Role role,
        boolean active,
        Instant lastLoginAt,
        Instant createdAt,
        String phone,
        String photoUrl,
        StudentSection student,
        AdminSection admin
) {

    public record StudentSection(
            String enrollmentNo,
            String address,
            String qualification,
            String linkedinUrl,
            String githubUrl,
            String collegeName,
            String courseName,
            String batchName,
            boolean academicDetailsComplete,
            List<String> missingAcademicFields
    ) {
    }

    public record AdminSection(
            String designation,
            String department
    ) {
    }
}
