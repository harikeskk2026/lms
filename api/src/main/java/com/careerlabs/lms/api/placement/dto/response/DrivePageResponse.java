package com.careerlabs.lms.api.placement.dto.response;

import java.util.List;

public record DrivePageResponse(
        List<AdminDriveResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}