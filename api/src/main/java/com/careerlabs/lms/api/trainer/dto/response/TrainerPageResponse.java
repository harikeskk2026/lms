package com.careerlabs.lms.api.trainer.dto.response;

import java.util.List;

public class TrainerPageResponse {

    private List<TrainerResponse> trainers;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private long totalActive;
    private long totalInactive;

    public TrainerPageResponse() {
    }

    public TrainerPageResponse(List<TrainerResponse> trainers, long totalElements, int totalPages, int currentPage, long totalActive, long totalInactive) {
        this.trainers = trainers;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
        this.totalActive = totalActive;
        this.totalInactive = totalInactive;
    }

    public TrainerPageResponse(List<TrainerResponse> trainers, long totalElements, int totalPages, int currentPage) {
        this(trainers, totalElements, totalPages, currentPage, 0L, 0L);
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

    public long getTotalActive() {
        return totalActive;
    }

    public long getTotalInactive() {
        return totalInactive;
    }
}
