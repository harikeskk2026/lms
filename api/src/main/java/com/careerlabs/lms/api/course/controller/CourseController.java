package com.careerlabs.lms.api.course.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.request.CourseStatusRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.service.CourseService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
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

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;
    private final com.careerlabs.lms.api.material.service.MaterialService materialService;

    public CourseController(CourseService courseService,
                            com.careerlabs.lms.api.material.service.MaterialService materialService) {
        this.courseService = courseService;
        this.materialService = materialService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal,
                                                                     @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.of(courseService.list(principal, search)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> get(@PathVariable Long id,
                                                             @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(courseService.get(id, principal)));
    }

    @GetMapping("/{id}/materials")
    public ResponseEntity<ApiResponse<List<com.careerlabs.lms.api.material.dto.response.MaterialResponse>>> listMaterials(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(materialService.listAllForCourse(id, principal)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CourseRequest request) {
        CourseResponse response = courseService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Course created", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> update(@PathVariable Long id,
                                                                @Valid @RequestBody CourseRequest request) {
        CourseResponse response = courseService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course updated", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CourseResponse>> updateStatus(@PathVariable Long id,
                                                                       @Valid @RequestBody CourseStatusRequest request) {
        CourseResponse response = courseService.updateStatus(id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.of("Course status updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Course deleted", null));
    }
}
