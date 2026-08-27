package com.careerlabs.lms.api.batch.service;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;

import java.util.List;

public interface BatchService {

    List<BatchResponse> list();

    BatchResponse get(Long id);

    BatchResponse create(BatchRequest request);

    BatchResponse update(Long id, BatchRequest request);

    BatchResponse toggleActive(Long id);

    void delete(Long id);
}
