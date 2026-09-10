package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourceResponse;

import java.util.List;

public interface InterviewResourceService {

    List<InterviewResourceResponse> listActive();

    List<InterviewResourceResponse> listAll(Boolean active);

    InterviewResourceResponse get(Long id);

    InterviewResourceResponse create(CreateInterviewResourceRequest request, Long createdBy);

    InterviewResourceResponse update(Long id, UpdateInterviewResourceRequest request);

    void delete(Long id);
}