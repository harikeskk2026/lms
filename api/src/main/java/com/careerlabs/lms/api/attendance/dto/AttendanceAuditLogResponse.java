package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.AttendanceAuditLog;

import java.time.Instant;
import java.time.LocalDateTime;

public record AttendanceAuditLogResponse(
        Long id,
        Long attendanceId,
        Long classId,
        String classTitle,
        String batchName,
        Long studentId,
        String studentName,
        String studentEnrollmentNo,
        AttendStatus previousStatus,
        AttendStatus newStatus,
        Long changedBy,
        String changedByName,
        String changedByRole,
        String actionType,
        String remarks,
        LocalDateTime classDate,
        Instant createdAt
) {
    public static AttendanceAuditLogResponse from(AttendanceAuditLog log) {
        if (log == null) return null;
        return new AttendanceAuditLogResponse(
                log.getId(),
                log.getAttendanceId(),
                log.getDailyClass() != null ? log.getDailyClass().getId() : null,
                log.getDailyClass() != null ? log.getDailyClass().getTitle() : null,
                log.getDailyClass() != null && log.getDailyClass().getBatch() != null ? log.getDailyClass().getBatch().getName() : null,
                log.getStudent() != null ? log.getStudent().getId() : null,
                log.getStudent() != null && log.getStudent().getUser() != null ? log.getStudent().getUser().getName() : null,
                log.getStudent() != null ? log.getStudent().getEnrollmentNo() : null,
                log.getPreviousStatus(),
                log.getNewStatus(),
                log.getChangedBy(),
                log.getChangedByName(),
                log.getChangedByRole(),
                log.getActionType(),
                log.getRemarks(),
                log.getDailyClass() != null ? log.getDailyClass().getDate() : null,
                log.getCreatedAt()
        );
    }
}
