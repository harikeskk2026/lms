package com.careerlabs.lms.api.material.controller;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.material.dto.request.MaterialRequest;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.dto.response.UploadResponse;
import com.careerlabs.lms.api.material.service.MaterialService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;

    public MaterialController(MaterialService materialService) {
        this.materialService = materialService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> list(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long moduleId,
            @RequestParam(required = false) Long topicId,
            @RequestParam(required = false) Long sessionId,
            @RequestParam(required = false, defaultValue = "false") boolean all,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        if (all) {
            if (courseId == null) {
                throw new BadRequestException("courseId is required when all=true");
            }
            return ResponseEntity.ok(ApiResponse.of(materialService.listAllForCourse(courseId, principal)));
        }
        return ResponseEntity.ok(ApiResponse.of(materialService.list(courseId, moduleId, topicId, sessionId, principal)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MaterialResponse>> create(@Valid @RequestBody MaterialRequest request) {
        MaterialResponse response = materialService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Material added", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaterialResponse>> update(@PathVariable Long id,
                                                                   @Valid @RequestBody MaterialRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Material updated", materialService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        materialService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Material deleted", null));
    }

    @PutMapping("/reorder")
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> reorder(@Valid @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Materials reordered", materialService.reorder(request)));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadResponse>> upload(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.of(materialService.upload(file)));
    }
}
