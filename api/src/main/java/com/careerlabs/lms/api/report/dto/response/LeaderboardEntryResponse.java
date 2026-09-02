package com.careerlabs.lms.api.report.dto.response;

public record LeaderboardEntryResponse(int rank, Long id, String name, String subtitle, Double score) {
}
