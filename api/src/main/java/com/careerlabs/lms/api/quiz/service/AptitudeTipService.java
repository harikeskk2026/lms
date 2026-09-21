package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.request.CreateAptitudeTipRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateAptitudeTipRequest;
import com.careerlabs.lms.api.quiz.dto.response.AptitudeTipPageResponse;
import com.careerlabs.lms.api.quiz.dto.response.AptitudeTipResponse;

import java.util.List;

public interface AptitudeTipService {

    List<AptitudeTipResponse> listActive();

    List<AptitudeTipResponse> listAll(Boolean active);

    AptitudeTipPageResponse page(String search, Boolean active, int page, int limit);

    AptitudeTipResponse get(Long id);

    AptitudeTipResponse create(CreateAptitudeTipRequest request, Long createdBy);

    AptitudeTipResponse update(Long id, UpdateAptitudeTipRequest request);

    void delete(Long id);
}