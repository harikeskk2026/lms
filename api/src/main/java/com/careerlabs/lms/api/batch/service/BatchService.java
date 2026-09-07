package com.careerlabs.lms.api.batch.service;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;

import java.util.List;

public interface BatchService {

    List<BatchResponse> list();

    List<BatchResponse> list(JwtUserPrincipal principal);

    BatchResponse get(Long id);

    BatchResponse get(Long id, JwtUserPrincipal principal);

    BatchResponse create(BatchRequest request);

    BatchResponse update(Long id, BatchRequest request);

    BatchResponse toggleActive(Long id);

    void delete(Long id);
}
