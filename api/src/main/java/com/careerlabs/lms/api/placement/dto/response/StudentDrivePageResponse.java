package com.careerlabs.lms.api.placement.dto.response;

import java.util.List;

public record StudentDrivePageResponse(
        List<StudentDriveResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}
