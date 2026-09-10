package com.careerlabs.lms.api.batch.dto.response;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;

import java.time.Instant;
import java.time.LocalDate;

public record BatchResponse(
        Long id,
        String name,
        CourseSummary course,
        Long trainerId,
        TrainerSummary trainer,
        LocalDate startDate,
        LocalDate endDate,
        String timing,
        BatchMode mode,
        int maxStudents,
        boolean isActive,
        String status,
        Instant createdAt,
        Instant updatedAt,
        int studentCount
) {

    public static BatchResponse from(Batch batch, int studentCount) {
        return from(batch, studentCount, null);
    }

    public static BatchResponse from(Batch batch, int studentCount, TrainerSummary trainer) {
        String status = computeStatus(batch.getStartDate(), batch.getEndDate());
        return new BatchResponse(
                batch.getId(),
                batch.getName(),
                new CourseSummary(batch.getCourse().getId(), batch.getCourse().getTitle()),
                batch.getTrainerId(),
                trainer,
                batch.getStartDate(),
                batch.getEndDate(),
                batch.getTiming(),
                batch.getMode(),
                batch.getMaxStudents(),
                batch.isActive(),
                status,
                batch.getCreatedAt(),
                batch.getUpdatedAt(),
                studentCount);
    }

    private static String computeStatus(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return "UNKNOWN";
        }
        LocalDate today = LocalDate.now();
        if (today.isBefore(startDate)) {
            return "UPCOMING";
        } else if (!today.isAfter(endDate)) {
            return "ACTIVE";
        } else {
            return "ENDED";
        }
    }

    public record CourseSummary(Long id, String title) {
    }

    public record TrainerSummary(Long id, String name, String email) {
    }
}
