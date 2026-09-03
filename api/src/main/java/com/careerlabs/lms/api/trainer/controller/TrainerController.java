package com.careerlabs.lms.api.trainer.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.trainer.dto.request.TrainerCreateRequest;
import com.careerlabs.lms.api.trainer.dto.request.TrainerUpdateRequest;
import com.careerlabs.lms.api.trainer.dto.response.TrainerPageResponse;
import com.careerlabs.lms.api.trainer.dto.response.TrainerResponse;
import com.careerlabs.lms.api.trainer.service.TrainerService;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/api/trainers")
public class TrainerController {

    private final TrainerService trainerService;

    public TrainerController(TrainerService trainerService) {
        this.trainerService = trainerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TrainerPageResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        TrainerPageResponse response = trainerService.listTrainers(search, status, page, limit);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TrainerResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(trainerService.getTrainer(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TrainerResponse>> create(@Valid @RequestBody TrainerCreateRequest request) {
        TrainerResponse response = trainerService.createTrainer(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Trainer created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TrainerResponse>> update(@PathVariable Long id,
                                                                 @Valid @RequestBody TrainerUpdateRequest request) {
        TrainerResponse response = trainerService.updateTrainer(id, request);
        return ResponseEntity.ok(ApiResponse.of("Trainer updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TrainerResponse>> toggleStatus(@PathVariable Long id) {
        TrainerResponse response = trainerService.toggleTrainerStatus(id);
        return ResponseEntity.ok(ApiResponse.of("Trainer status updated", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        trainerService.deleteTrainer(id);
        return ResponseEntity.ok(ApiResponse.of("Trainer deleted successfully", null));
    }
}
