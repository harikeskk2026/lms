package com.careerlabs.lms.api.student.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.student.dto.request.StudentCreateRequest;
import com.careerlabs.lms.api.student.dto.request.StudentUpdateRequest;
import com.careerlabs.lms.api.student.dto.response.StudentBulkImportResponse;
import com.careerlabs.lms.api.student.dto.response.StudentCountResponse;
import com.careerlabs.lms.api.student.dto.response.StudentPageResponse;
import com.careerlabs.lms.api.student.dto.response.StudentResponse;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

@RestController
@RequestMapping({"/api/students", "/api/admin/students"})
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<StudentPageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) PlacementStatus placementStatus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        StudentPageResponse response = studentService.list(search, batchId, status, placementStatus, page, limit);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<StudentCountResponse>> count() {
        return ResponseEntity.ok(ApiResponse.of(studentService.count()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(studentService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudentResponse>> create(@Valid @RequestBody StudentCreateRequest request) {
        StudentResponse response = studentService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Student created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentResponse>> update(@PathVariable Long id,
                                                                 @Valid @RequestBody StudentUpdateRequest request) {
        StudentResponse response = studentService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Student updated", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<StudentResponse>> toggleStatus(@PathVariable Long id) {
        StudentResponse response = studentService.toggleStatus(id);
        return ResponseEntity.ok(ApiResponse.of("Student status updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        studentService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Student deleted", null));
    }

    @PostMapping(value = "/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<StudentBulkImportResponse>> bulkImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "enrollImportedStudents", defaultValue = "false") boolean enrollImportedStudents,
            @RequestParam(value = "defaultCourseId", required = false) Long defaultCourseId,
            @RequestParam(value = "defaultBatchId", required = false) Long defaultBatchId) {
        StudentBulkImportResponse response = studentService.bulkImport(file, enrollImportedStudents, defaultCourseId, defaultBatchId);
        return ResponseEntity.ok(ApiResponse.of("Bulk import completed", response));
    }
}
