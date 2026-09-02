package com.careerlabs.lms.api.syllabus.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import com.careerlabs.lms.api.syllabus.dto.request.SyllabusModuleRequest;
import com.careerlabs.lms.api.syllabus.dto.request.SyllabusTopicRequest;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusModuleResponse;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusTopicResponse;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class SyllabusController {

    private final SyllabusService syllabusService;

    public SyllabusController(SyllabusService syllabusService) {
        this.syllabusService = syllabusService;
    }

    @GetMapping("/api/courses/{courseId}/modules")
    public ResponseEntity<ApiResponse<List<SyllabusModuleResponse>>> listTree(
            @PathVariable Long courseId, @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(syllabusService.listTree(courseId, principal)));
    }

    @PostMapping("/api/courses/{courseId}/modules")
    public ResponseEntity<ApiResponse<SyllabusModuleResponse>> createModule(
            @PathVariable Long courseId, @Valid @RequestBody SyllabusModuleRequest request) {
        SyllabusModuleResponse response = syllabusService.createModule(courseId, request);
        return ResponseEntity.status(201).body(ApiResponse.of("Module added", response));
    }

    @PutMapping("/api/courses/{courseId}/modules/reorder")
    public ResponseEntity<ApiResponse<List<SyllabusModuleResponse>>> reorderModules(
            @PathVariable Long courseId, @Valid @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Modules reordered", syllabusService.reorderModules(courseId, request)));
    }

    @PutMapping("/api/modules/{id}")
    public ResponseEntity<ApiResponse<SyllabusModuleResponse>> updateModule(
            @PathVariable Long id, @Valid @RequestBody SyllabusModuleRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Module updated", syllabusService.updateModule(id, request)));
    }

    @DeleteMapping("/api/modules/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteModule(@PathVariable Long id) {
        syllabusService.deleteModule(id);
        return ResponseEntity.ok(ApiResponse.of("Module deleted", null));
    }

    @PostMapping("/api/modules/{moduleId}/topics")
    public ResponseEntity<ApiResponse<SyllabusTopicResponse>> createTopic(
            @PathVariable Long moduleId, @Valid @RequestBody SyllabusTopicRequest request) {
        SyllabusTopicResponse response = syllabusService.createTopic(moduleId, request);
        return ResponseEntity.status(201).body(ApiResponse.of("Topic added", response));
    }

    @PutMapping("/api/modules/{moduleId}/topics/reorder")
    public ResponseEntity<ApiResponse<List<SyllabusTopicResponse>>> reorderTopics(
            @PathVariable Long moduleId, @Valid @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Topics reordered", syllabusService.reorderTopics(moduleId, request)));
    }

    @PutMapping("/api/topics/{id}")
    public ResponseEntity<ApiResponse<SyllabusTopicResponse>> updateTopic(
            @PathVariable Long id, @Valid @RequestBody SyllabusTopicRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Topic updated", syllabusService.updateTopic(id, request)));
    }

    @DeleteMapping("/api/topics/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTopic(@PathVariable Long id) {
        syllabusService.deleteTopic(id);
        return ResponseEntity.ok(ApiResponse.of("Topic deleted", null));
    }
}
