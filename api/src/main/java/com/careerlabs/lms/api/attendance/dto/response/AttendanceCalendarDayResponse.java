package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public record AttendanceCalendarDayResponse(
        Long attendanceId,
        Long classId,
        String classTitle,
        Long trainerId,
        LocalDateTime date,
        ClassStatus classStatus,
        AttendStatus attendanceStatus,
        Instant markedAt,
        String meetLink,
        String recordingUrl
) {
}
