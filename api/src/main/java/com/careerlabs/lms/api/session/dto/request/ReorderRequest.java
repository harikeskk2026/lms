package com.careerlabs.lms.api.session.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class ReorderRequest {

    @NotEmpty(message = "orderedIds must not be empty")
    private List<Long> orderedIds;

    public List<Long> getOrderedIds() {
        return orderedIds;
    }

    public void setOrderedIds(List<Long> orderedIds) {
        this.orderedIds = orderedIds;
    }
}
