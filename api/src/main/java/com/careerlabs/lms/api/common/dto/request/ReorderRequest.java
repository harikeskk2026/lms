package com.careerlabs.lms.api.common.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Generic reorder payload: the ids of a set of sibling items, in their new
 * desired order. Shared across syllabus modules/topics, sessions and
 * materials rather than duplicated per domain.
 */
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
