package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;

import java.time.LocalDateTime;

public record TodayClassResponse(
        Long classId,
        Long batchId,
        String batchName,
        LocalDateTime date,
        String title,
        ClassStatus status,
        int present,
        int absent,
        int totalStudents,
        String meetLink,
        String recordingUrl
) {
}
