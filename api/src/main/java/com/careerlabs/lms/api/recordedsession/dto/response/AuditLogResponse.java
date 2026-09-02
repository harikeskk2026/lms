package com.careerlabs.lms.api.recordedsession.dto.response;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAuditLog;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        Long studentId,
        String studentName,
        String studentEmail,
        String deviceId,
        String ipAddress,
        String action,
        String result,
        Instant createdAt
) {

    public static AuditLogResponse from(RecordedSessionAuditLog log, String studentName, String studentEmail) {
        return new AuditLogResponse(
                log.getId(),
                log.getStudentId(),
                studentName,
                studentEmail,
                log.getDeviceId(),
                log.getIpAddress(),
                log.getAction(),
                log.getResult(),
                log.getCreatedAt());
    }
}
