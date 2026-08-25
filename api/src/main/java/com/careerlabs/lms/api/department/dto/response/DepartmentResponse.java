package com.careerlabs.lms.api.department.dto.response;

import com.careerlabs.lms.api.department.entity.Department;

import java.time.Instant;

public record DepartmentResponse(
        Long id,
        String name,
        CourseSummary course,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                new CourseSummary(department.getCourse().getId(), department.getCourse().getTitle()),
                department.isActive(),
                department.getCreatedAt(),
                department.getUpdatedAt());
    }

    public record CourseSummary(Long id, String title) {
    }
}
