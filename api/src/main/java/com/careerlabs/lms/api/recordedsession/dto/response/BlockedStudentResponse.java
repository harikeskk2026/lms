package com.careerlabs.lms.api.recordedsession.dto.response;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAccessBlock;

import java.time.Instant;

public record BlockedStudentResponse(
        Long studentUserId,
        String studentName,
        String studentEmail,
        Instant blockedAt
) {

    public static BlockedStudentResponse from(RecordedSessionAccessBlock block, String studentName, String studentEmail) {
        return new BlockedStudentResponse(block.getStudentUserId(), studentName, studentEmail, block.getCreatedAt());
    }
}
