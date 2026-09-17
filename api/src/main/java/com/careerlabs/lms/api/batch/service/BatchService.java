package com.careerlabs.lms.api.batch.service;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;

import java.util.List;

public interface BatchService {

    List<BatchResponse> list();

    List<BatchResponse> list(JwtUserPrincipal principal);

    /** Same as {@link #list(JwtUserPrincipal)}, additionally narrowed to batches whose name or course title
     * contains {@code search} (case-insensitive). A blank/null search is a no-op. */
    List<BatchResponse> list(JwtUserPrincipal principal, String search);

    BatchResponse get(Long id);

    BatchResponse get(Long id, JwtUserPrincipal principal);

    BatchResponse create(BatchRequest request);

    BatchResponse update(Long id, BatchRequest request);

    BatchResponse toggleActive(Long id);

    void delete(Long id);
}
