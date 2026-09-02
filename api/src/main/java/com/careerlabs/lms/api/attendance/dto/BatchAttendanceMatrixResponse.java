package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record BatchAttendanceMatrixResponse(
        BatchInfoDto batch,
        List<ClassSummaryDto> classes,
        List<StudentMatrixRowDto> matrix
) {
    public record BatchInfoDto(
            Long id,
            String name,
            String courseTitle
    ) {}

    public record ClassSummaryDto(
            Long classId,
            LocalDateTime date,
            String title,
            ClassStatus status,
            int present,
            int absent,
            int late,
            int unmarked,
            int pct
    ) {}

    public record StudentMatrixRowDto(
            Long studentId,
            String name,
            String email,
            String enrollmentNo,
            int present,
            int total,
            int pct,
            Map<String, String> records
    ) {}
}
