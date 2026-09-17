package com.careerlabs.lms.api.trainer.dto.request;

import java.util.List;

/**
 * One "course group" from the trainer Add/Edit form: a course plus the
 * batches (of that course) the trainer is being assigned to. The backend
 * validates that every batchId here actually belongs to courseId - the
 * grouping is meaningful, not just a display convenience.
 */
public class CourseBatchAssignment {

    private Long courseId;
    private List<Long> batchIds;

    public CourseBatchAssignment() {
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public List<Long> getBatchIds() {
        return batchIds;
    }

    public void setBatchIds(List<Long> batchIds) {
        this.batchIds = batchIds;
    }
}
