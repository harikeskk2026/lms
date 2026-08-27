package com.careerlabs.lms.api.report.dto.response;

import java.util.List;

/**
 * A single relationship view between two metrics, as raw scatter points (no coefficient
 * computed). "note" always frames this as a relationship, never a claim of causation.
 */
public record CorrelationResponse(
        String label,
        String xLabel,
        String yLabel,
        List<Point> points,
        String note
) {

    public record Point(Double x, Double y, String studentName) {
    }
}
