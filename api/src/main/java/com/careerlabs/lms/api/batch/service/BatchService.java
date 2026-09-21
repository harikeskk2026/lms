package com.careerlabs.lms.api.batch.service;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface BatchService {

    List<BatchResponse> list();

    List<BatchResponse> list(JwtUserPrincipal principal);

    /** Same as {@link #list(JwtUserPrincipal)}, additionally narrowed to batches whose name or course title
     * contains {@code search} (case-insensitive). A blank/null search is a no-op. */
    List<BatchResponse> list(JwtUserPrincipal principal, String search);

    /** Same as {@link #list(JwtUserPrincipal, String)}, additionally narrowed to batches whose
     * delivery mode equals {@code mode} (ONLINE or OFFLINE). A null/blank mode is a no-op.
     * @throws com.careerlabs.lms.api.common.exception.BadRequestException if mode is not ONLINE or OFFLINE */
    List<BatchResponse> list(JwtUserPrincipal principal, String search, String mode);

    BatchResponse get(Long id);

    BatchResponse get(Long id, JwtUserPrincipal principal);

    BatchResponse create(BatchRequest request);

    BulkImportResponse<BatchResponse> bulkImportBatches(MultipartFile file);

    BatchResponse update(Long id, BatchRequest request);

    BatchResponse toggleActive(Long id);

    void delete(Long id);
}
