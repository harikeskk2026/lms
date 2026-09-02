package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;

import java.time.Instant;

public record AttendanceRecordResponse(
        Long id,
        Long classId,
        Long studentId,
        AttendStatus status,
        String remarks,
        Long markedBy,
        Instant markedAt
) {

    public static AttendanceRecordResponse from(Attendance attendance) {
        return new AttendanceRecordResponse(
                attendance.getId(),
                attendance.getDailyClass().getId(),
                attendance.getStudent().getId(),
                attendance.getStatus(),
                attendance.getRemarks(),
                attendance.getMarkedBy(),
                attendance.getMarkedAt());
    }
}
