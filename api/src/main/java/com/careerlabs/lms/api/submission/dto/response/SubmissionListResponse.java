package com.careerlabs.lms.api.submission.dto.response;

import java.util.List;

public record SubmissionListResponse(
        List<SubmissionRowResponse> submissions,
        SubmissionSummaryResponse summary
) {
}
