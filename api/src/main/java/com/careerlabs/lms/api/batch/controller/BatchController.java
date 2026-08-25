package com.careerlabs.lms.api.batch.controller;

import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.dto.response.BatchResponse;
import com.careerlabs.lms.api.batch.service.BatchService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BatchResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(batchService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BatchResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(batchService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BatchResponse>> create(@Valid @RequestBody BatchRequest request) {
        BatchResponse response = batchService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Batch created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BatchResponse>> update(@PathVariable Long id,
                                                               @Valid @RequestBody BatchRequest request) {
        BatchResponse response = batchService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Batch updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        batchService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Batch deleted", null));
    }
}
