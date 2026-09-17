package com.careerlabs.lms.api.student.dto.request;

/**
 * One "course group" from the student Add/Edit form: a course plus, at
 * most, one batch of that course (Enrollment has a unique student+course
 * constraint with a single nullable batch column - a student can only be in
 * one batch per course at a time, unlike the trainer<->batch many-to-many).
 */
public class StudentCourseBatchAssignment {

    private Long courseId;
    private Long batchId;

    public StudentCourseBatchAssignment() {
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }
}
