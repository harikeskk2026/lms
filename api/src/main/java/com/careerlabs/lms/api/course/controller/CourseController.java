package com.careerlabs.lms.api.course.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.service.CourseService;
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
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(courseService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(courseService.get(id)));
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

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Course deleted", null));
    }
}
