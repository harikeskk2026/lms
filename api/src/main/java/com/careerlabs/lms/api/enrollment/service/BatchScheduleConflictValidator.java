package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.util.ScheduleOverlapUtil;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.student.entity.Student;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BatchScheduleConflictValidator {

    private final EnrollmentRepository enrollmentRepository;

    public BatchScheduleConflictValidator(EnrollmentRepository enrollmentRepository) {
        this.enrollmentRepository = enrollmentRepository;
    }

    /**
     * Validate that enrolling/assigning the given student to newBatch does not cause
     * a schedule conflict with any of the student's existing active batch enrollments.
     * Conflict = date overlap AND time overlap.
     */
    public void validate(Student student, Batch newBatch) {
        validate(student, newBatch, null);
    }

    /**
     * Same as {@link #validate(Student, Batch)} but excludes the enrollment for excludeCourseId
     * (used when checking duplicate-course reactivation so we don't compare the batch against itself).
     */
    public void validate(Student student, Batch newBatch, Long excludeCourseId) {
        if (student == null || newBatch == null || student.getId() == null) {
            return;
        }

        List<Enrollment> activeEnrollments = enrollmentRepository
                .findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());

        for (Enrollment enrollment : activeEnrollments) {
            if (excludeCourseId != null && enrollment.getCourse() != null
                    && enrollment.getCourse().getId().equals(excludeCourseId)) {
                continue;
            }
            Batch existingBatch = enrollment.getBatch();
            if (existingBatch == null || !existingBatch.isActive()) {
                continue;
            }
            if (existingBatch.getId() != null && existingBatch.getId().equals(newBatch.getId())) {
                continue;
            }
            if (ScheduleOverlapUtil.isScheduleOverlap(existingBatch, newBatch)) {
                throw new ConflictException(formatMessage(existingBatch));
            }
        }
    }

    public void validate(Student student, Batch newBatch, Long excludeCourseId, boolean includeLegacyBatch) {
        validate(student, newBatch, excludeCourseId);
    }

    private String formatMessage(Batch existingBatch) {
        String timing = (existingBatch.getTiming() != null && !existingBatch.getTiming().isBlank())
                ? existingBatch.getTiming()
                : "full day";
        String courseTitle = existingBatch.getCourse() != null ? existingBatch.getCourse().getTitle() : "Unknown Course";
        return String.format(
                "Student cannot be enrolled in this batch because its schedule overlaps with an existing batch: %s / %s, %s - %s, %s.",
                courseTitle,
                existingBatch.getName(),
                existingBatch.getStartDate(),
                existingBatch.getEndDate(),
                timing
        );
    }
}
