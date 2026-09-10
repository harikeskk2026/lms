package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CreateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.MockCandidateFeedbackRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.MockInterviewResponse;

import java.util.List;

public interface MockInterviewService {

    List<MockInterviewResponse> listAll();

    MockInterviewResponse create(CreateMockInterviewRequest request);

    MockInterviewResponse update(Long id, UpdateMockInterviewRequest request);

    MockInterviewResponse updateCandidate(Long mockInterviewId, Long candidateId, MockCandidateFeedbackRequest request);
}