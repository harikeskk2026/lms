package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.MockInterviewCandidateStatus;

import java.util.List;

public record MockCandidateFeedbackRequest(
    MockInterviewCandidateStatus status,
    Integer rating,
    String feedback,
    List<String> strengths,
    List<String> improvements
) {}