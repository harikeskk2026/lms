package com.careerlabs.lms.api.syllabus.dto.request;

import com.careerlabs.lms.api.syllabus.validation.SyllabusValidationMessages;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/** Generic reorder payload: the ids of the items, in their new desired order. */
public class ReorderRequest {

    @NotEmpty(message = SyllabusValidationMessages.ORDERED_IDS_REQUIRED)
    private List<Long> orderedIds;

    public List<Long> getOrderedIds() {
        return orderedIds;
    }

    public void setOrderedIds(List<Long> orderedIds) {
        this.orderedIds = orderedIds;
    }
}
