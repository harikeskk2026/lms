package com.careerlabs.lms.api.batch.controller;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.service.BatchService;
import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BatchResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal,
                                                                   @RequestParam(required = false) String search,
                                                                   @RequestParam(required = false) String mode) {
        return ResponseEntity.ok(ApiResponse.of(batchService.list(principal, search, mode)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BatchResponse>> get(@PathVariable Long id,
                                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(batchService.get(id, principal)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BatchResponse>> create(@Valid @RequestBody BatchRequest request) {
        BatchResponse response = batchService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Batch created", response));
    }

    @PostMapping(value = "/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<BulkImportResponse<BatchResponse>>> bulkImport(
            @RequestParam("file") MultipartFile file) {
        BulkImportResponse<BatchResponse> response = batchService.bulkImportBatches(file);
        return ResponseEntity.ok(ApiResponse.of("Bulk import completed", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BatchResponse>> update(@PathVariable Long id,
                                                               @Valid @RequestBody BatchRequest request) {
        BatchResponse response = batchService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Batch updated", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<BatchResponse>> toggleActive(@PathVariable Long id) {
        BatchResponse response = batchService.toggleActive(id);
        return ResponseEntity.ok(ApiResponse.of("Batch status updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        batchService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Batch deleted", null));
    }
}
