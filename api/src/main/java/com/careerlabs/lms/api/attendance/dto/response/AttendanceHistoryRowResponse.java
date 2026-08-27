package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public record AttendanceHistoryRowResponse(
        Long attendanceId,
        Long studentId,
        String studentName,
        Long classId,
        String classTitle,
        Long batchId,
        String batchName,
        String courseTitle,
        LocalDateTime date,
        AttendStatus status,
        String remarks,
        Long markedBy,
        Instant markedAt
) {

    public static AttendanceHistoryRowResponse from(Attendance attendance) {
        return new AttendanceHistoryRowResponse(
                attendance.getId(),
                attendance.getStudent().getId(),
                attendance.getStudent().getUser().getName(),
                attendance.getDailyClass().getId(),
                attendance.getDailyClass().getTitle(),
                attendance.getDailyClass().getBatch() != null ? attendance.getDailyClass().getBatch().getId() : null,
                attendance.getDailyClass().getBatch() != null ? attendance.getDailyClass().getBatch().getName() : null,
                attendance.getDailyClass().getBatch() != null ? attendance.getDailyClass().getBatch().getCourse().getTitle() : null,
                attendance.getDailyClass().getDate(),
                attendance.getStatus(),
                attendance.getRemarks(),
                attendance.getMarkedBy(),
                attendance.getMarkedAt());
    }
}
