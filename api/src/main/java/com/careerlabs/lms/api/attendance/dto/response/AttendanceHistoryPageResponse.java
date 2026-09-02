package com.careerlabs.lms.api.attendance.dto.response;

import java.util.List;

public record AttendanceHistoryPageResponse(
        List<AttendanceHistoryRowResponse> items,
        long total,
        int page,
        int totalPages
) {
}
