package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.student.entity.PlacementStatus;
import java.util.List;
import java.util.Map;

public record AdminPlacementOverviewResponse(
    Map<String, Long> statusCounts,
    int conversionRate,
    List<PlacementStudentItem> students
) {
    public record PlacementStudentItem(
        Long id,
        String name,
        String email,
        String phone,
        PlacementStatus placementStatus,
        long mockCount,
        int avgMockRating,
        String updatedAt
    ) {}
}
