package com.careerlabs.lms.api.user.dto.response;

import java.util.List;

public class AdminPageResponse {

    private List<AdminResponse> admins;
    private long totalElements;
    private int totalPages;
    private int page;

    public AdminPageResponse() {}

    public AdminPageResponse(List<AdminResponse> admins, long totalElements, int totalPages, int page) {
        this.admins = admins;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.page = page;
    }

    public List<AdminResponse> getAdmins() { return admins; }
    public long getTotalElements() { return totalElements; }
    public int getTotalPages() { return totalPages; }
    public int getPage() { return page; }
}
