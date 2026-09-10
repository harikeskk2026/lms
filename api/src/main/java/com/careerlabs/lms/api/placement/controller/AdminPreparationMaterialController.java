package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.CreatePreparationMaterialRequest;
import com.careerlabs.lms.api.placement.dto.request.PreparationQuestionRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdatePreparationMaterialRequest;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialDetailResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialResponse;
import com.careerlabs.lms.api.placement.service.PreparationMaterialService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/preparation-materials")
public class AdminPreparationMaterialController {

    private final PreparationMaterialService preparationMaterialService;

    public AdminPreparationMaterialController(PreparationMaterialService preparationMaterialService) {
        this.preparationMaterialService = preparationMaterialService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PreparationMaterialResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(preparationMaterialService.listForAdmin()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PreparationMaterialDetailResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(preparationMaterialService.getForAdminDetail(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PreparationMaterialResponse>> create(@Valid @RequestBody CreatePreparationMaterialRequest request,
                                                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.status(201).body(ApiResponse.of("Preparation material created",
                preparationMaterialService.create(request, principal.id())));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PreparationMaterialResponse>> update(@PathVariable Long id,
                                                                           @Valid @RequestBody UpdatePreparationMaterialRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Preparation material updated", preparationMaterialService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        preparationMaterialService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Preparation material deleted", null));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<PreparationMaterialResponse>> publish(@PathVariable Long id,
                                                                            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Preparation material published", preparationMaterialService.publish(id, principal.id())));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<PreparationMaterialResponse>> archive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Preparation material archived", preparationMaterialService.archive(id)));
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PreparationMaterialResponse>> uploadDocument(@PathVariable Long id,
                                                                                   @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.of("Document uploaded", preparationMaterialService.uploadDocument(id, file)));
    }

    @DeleteMapping("/{id}/documents/{documentId}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id, @PathVariable Long documentId) {
        preparationMaterialService.deleteDocument(id, documentId);
        return ResponseEntity.ok(ApiResponse.of("Document removed", null));
    }

    @PutMapping("/{id}/questions")
    public ResponseEntity<ApiResponse<PreparationMaterialDetailResponse>> setQuestions(@PathVariable Long id,
                                                                                       @RequestBody List<@Valid PreparationQuestionRequest> questions) {
        return ResponseEntity.ok(ApiResponse.of("Questions updated", preparationMaterialService.setQuestions(id, questions)));
    }
}