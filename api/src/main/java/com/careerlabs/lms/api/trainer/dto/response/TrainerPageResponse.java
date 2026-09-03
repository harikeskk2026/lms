package com.careerlabs.lms.api.trainer.dto.response;

import java.util.List;

public class TrainerPageResponse {

    private List<TrainerResponse> trainers;
    private long totalElements;
    private int totalPages;
    private int currentPage;

    public TrainerPageResponse() {
    }

    public TrainerPageResponse(List<TrainerResponse> trainers, long totalElements, int totalPages, int currentPage) {
        this.trainers = trainers;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
    }

    public List<TrainerResponse> getTrainers() {
        return trainers;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public int getCurrentPage() {
        return currentPage;
    }
}
