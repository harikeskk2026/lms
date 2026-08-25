package com.careerlabs.lms.api.college.controller;

import com.careerlabs.lms.api.college.dto.request.CollegeRequest;
import com.careerlabs.lms.api.college.dto.response.CollegeResponse;
import com.careerlabs.lms.api.college.service.CollegeService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/colleges")
public class CollegeController {

    private final CollegeService collegeService;

    public CollegeController(CollegeService collegeService) {
        this.collegeService = collegeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CollegeResponse>>> list(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.of(collegeService.list(search)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CollegeResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(collegeService.get(id)));
    }

    @GetMapping("/{id}/courses")
    public ResponseEntity<ApiResponse<List<CollegeResponse.CourseSummary>>> getCourses(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(collegeService.get(id).courses()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CollegeResponse>> create(@Valid @RequestBody CollegeRequest request) {
        CollegeResponse response = collegeService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("College created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CollegeResponse>> update(@PathVariable Long id,
                                                                 @Valid @RequestBody CollegeRequest request) {
        CollegeResponse response = collegeService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("College updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        collegeService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("College deleted", null));
    }
}
