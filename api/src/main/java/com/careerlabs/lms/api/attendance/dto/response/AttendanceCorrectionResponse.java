package com.careerlabs.lms.api.attendance.dto.response;

import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public record AttendanceCorrectionResponse(
        Long id,
        Long attendanceId,
        Long classId,
        String classTitle,
        LocalDateTime classDate,
        Long studentId,
        String studentName,
        AttendStatus currentStatus,
        AttendStatus requestedStatus,
        String reason,
        String comment,
        String documentUrl,
        CorrectionStatus status,
        Long reviewedBy,
        Instant reviewedAt,
        Instant createdAt
) {

    public static AttendanceCorrectionResponse from(AttendanceCorrection correction) {
        return new AttendanceCorrectionResponse(
                correction.getId(),
                correction.getAttendance().getId(),
                correction.getAttendance().getDailyClass().getId(),
                correction.getAttendance().getDailyClass().getTitle(),
                correction.getAttendance().getDailyClass().getDate(),
                correction.getStudent().getId(),
                correction.getStudent().getUser().getName(),
                correction.getAttendance().getStatus(),
                correction.getRequestedStatus(),
                correction.getReason(),
                correction.getComment(),
                correction.getDocumentUrl(),
                correction.getStatus(),
                correction.getReviewedBy(),
                correction.getReviewedAt(),
                correction.getCreatedAt());
    }
}
