package com.careerlabs.lms.api.trainer.service;

import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.trainer.dto.request.TrainerCreateRequest;
import com.careerlabs.lms.api.trainer.dto.request.TrainerUpdateRequest;
import com.careerlabs.lms.api.trainer.dto.response.TrainerPageResponse;
import com.careerlabs.lms.api.trainer.dto.response.TrainerResponse;
import org.springframework.web.multipart.MultipartFile;

public interface TrainerService {

    TrainerPageResponse listTrainers(String search, String status, Long batchId, int page, int limit);

    TrainerResponse getTrainer(Long id);

    TrainerResponse createTrainer(TrainerCreateRequest request);

    BulkImportResponse<TrainerResponse> bulkImportTrainers(MultipartFile file, String defaultPassword);

    TrainerResponse updateTrainer(Long id, TrainerUpdateRequest request);

    TrainerResponse toggleTrainerStatus(Long id);

    void deleteTrainer(Long id);
}
