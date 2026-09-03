package com.careerlabs.lms.api.trainer.service;

import com.careerlabs.lms.api.trainer.dto.request.TrainerCreateRequest;
import com.careerlabs.lms.api.trainer.dto.request.TrainerUpdateRequest;
import com.careerlabs.lms.api.trainer.dto.response.TrainerPageResponse;
import com.careerlabs.lms.api.trainer.dto.response.TrainerResponse;

public interface TrainerService {

    TrainerPageResponse listTrainers(String search, String status, int page, int limit);

    TrainerResponse getTrainer(Long id);

    TrainerResponse createTrainer(TrainerCreateRequest request);

    TrainerResponse updateTrainer(Long id, TrainerUpdateRequest request);

    TrainerResponse toggleTrainerStatus(Long id);

    void deleteTrainer(Long id);
}
