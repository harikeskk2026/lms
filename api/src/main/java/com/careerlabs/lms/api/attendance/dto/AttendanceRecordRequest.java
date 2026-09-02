package com.careerlabs.lms.api.attendance.dto;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;

public record AttendanceRecordRequest(
        Long studentId,
        AttendStatus status,
        String remarks
) {

    public AttendanceRecordRequest(Long studentId, AttendStatus status) {
        this(studentId, status, null);
    }
}
