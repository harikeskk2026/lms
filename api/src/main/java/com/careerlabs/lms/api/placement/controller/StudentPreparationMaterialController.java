package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialDetailResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialPageResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialResponse;
import com.careerlabs.lms.api.placement.service.DocumentDownload;
import com.careerlabs.lms.api.placement.service.PreparationMaterialService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/student/preparation-materials")
public class StudentPreparationMaterialController {

    private final PreparationMaterialService preparationMaterialService;
    private final StudentRepository studentRepository;

    public StudentPreparationMaterialController(PreparationMaterialService preparationMaterialService,
                                                StudentRepository studentRepository) {
        this.preparationMaterialService = preparationMaterialService;
        this.studentRepository = studentRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PreparationMaterialPageResponse>> list(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        Student student = getStudent(principal.id());
        return ResponseEntity.ok(ApiResponse.of(preparationMaterialService.pageForStudent(student.getId(), search, page, limit)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PreparationMaterialDetailResponse>> get(@PathVariable Long id,
                                                                              @AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = getStudent(principal.id());
        return ResponseEntity.ok(ApiResponse.of(preparationMaterialService.getForStudent(id, student.getId())));
    }

    @GetMapping("/{id}/documents/{documentId}")
    public ResponseEntity<byte[]> download(@PathVariable Long id,
                                           @PathVariable Long documentId,
                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = getStudent(principal.id());
        DocumentDownload download = preparationMaterialService.downloadDocument(id, documentId, student.getId());

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(download.fileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(download.file().contentType()))
                .body(download.file().content());
    }

    private Student getStudent(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }
}