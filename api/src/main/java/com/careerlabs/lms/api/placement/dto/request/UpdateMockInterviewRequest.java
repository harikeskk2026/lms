package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.MockInterviewStatus;
import java.util.List;

public record UpdateMockInterviewRequest(
    String feedback,
    Integer rating,
    MockInterviewStatus status,
    List<String> strengths,
    List<String> improvements
) {}
