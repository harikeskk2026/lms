package com.careerlabs.lms.api.department.dto.response;

import com.careerlabs.lms.api.department.entity.Department;

import java.time.Instant;

public record DepartmentResponse(
        Long id,
        String name,
        CollegeSummary college,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {

    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(
                department.getId(),
                department.getName(),
                new CollegeSummary(department.getCollege().getId(), department.getCollege().getName()),
                department.isActive(),
                department.getCreatedAt(),
                department.getUpdatedAt());
    }

    public record CollegeSummary(Long id, String name) {
    }
}
