package com.careerlabs.lms.api.attendance.dto;

import java.util.List;

public record MarkAttendanceRequest(
        List<AttendanceRecordRequest> records,
        String status
) {}
