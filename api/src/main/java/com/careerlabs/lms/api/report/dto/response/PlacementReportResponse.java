package com.careerlabs.lms.api.report.dto.response;

import com.careerlabs.lms.api.student.entity.PlacementStatus;

import java.util.List;
import java.util.Map;

public record PlacementReportResponse(
        Map<PlacementStatus, Long> statusCounts,
        double conversionRate,
        List<BatchPlacement> byBatch,
        List<CoursePlacement> byCourse
) {

    public record BatchPlacement(Long batchId, String batchName, long totalStudents,
                                  long placedStudents, double placementRatePct) {
    }

    public record CoursePlacement(Long courseId, String courseTitle, long totalStudents,
                                   long placedStudents, double placementRatePct) {
    }
}
