package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.entity.Student;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Evaluates a student against a Drive's structured eligibility criteria - never
 * hard-coded, always read from the Drive's own fields. A null/empty criterion
 * means "no restriction on that dimension" and is skipped.
 *
 * <p>CGPA/percentage/backlogs criteria are evaluated against the student's UG
 * {@link AcademicDetails} record - the single source of truth for academic
 * history - rather than any field on {@link Student} itself.
 *
 * <p>{@code minAttendancePct} is intentionally NOT evaluated here: attendance
 * tracking does not exist anywhere in this system yet (see
 * {@code ReportServiceImpl.getAttendanceReport}, which is a hard-coded
 * "not yet available" stub). The field is still modeled on Drive for
 * forward-compatibility so it can be wired up once attendance tracking ships,
 * without another schema change.
 */
@Component
public class PlacementEligibilityGuard {

    private final AcademicDetailsRepository academicDetailsRepository;

    public PlacementEligibilityGuard(AcademicDetailsRepository academicDetailsRepository) {
        this.academicDetailsRepository = academicDetailsRepository;
    }

    public List<String> ineligibilityReasons(Student student, Drive drive) {
        List<String> reasons = new ArrayList<>();
        AcademicDetails academic = academicDetailsRepository.findByStudentId(student.getId()).orElse(null);

        if (drive.getMinCgpa() != null) {
            if (academic == null || academic.getUgScoreType() != AcademicScoreType.CGPA || academic.getUgScore() == null) {
                reasons.add("CGPA not on file (minimum required: " + drive.getMinCgpa() + ")");
            } else if (academic.getUgScore() < drive.getMinCgpa()) {
                reasons.add("CGPA below the required minimum of " + drive.getMinCgpa());
            }
        }

        if (drive.getMinPercentage() != null) {
            if (academic == null || academic.getUgScoreType() != AcademicScoreType.PERCENTAGE || academic.getUgScore() == null) {
                reasons.add("Percentage not on file (minimum required: " + drive.getMinPercentage() + ")");
            } else if (academic.getUgScore() < drive.getMinPercentage()) {
                reasons.add("Percentage below the required minimum of " + drive.getMinPercentage());
            }
        }

        if (drive.getMaxBacklogs() != null) {
            Integer backlogs = academic != null ? academic.getUgBacklogs() : null;
            if (backlogs == null) {
                reasons.add("Backlog count not on file (maximum allowed: " + drive.getMaxBacklogs() + ")");
            } else if (backlogs > drive.getMaxBacklogs()) {
                reasons.add("Backlogs exceed the maximum allowed (" + drive.getMaxBacklogs() + ")");
            }
        }

        if (!drive.getEligibleBatches().isEmpty()
                && (student.getBatch() == null || !drive.getEligibleBatches().contains(student.getBatch()))) {
            reasons.add("Not part of an eligible batch for this opportunity");
        }

        if (!drive.getEligibleCourses().isEmpty()
                && (student.getCourse() == null || !drive.getEligibleCourses().contains(student.getCourse()))) {
            reasons.add("Not enrolled in an eligible course for this opportunity");
        }

        return reasons;
    }

    public boolean isEligible(Student student, Drive drive) {
        return ineligibilityReasons(student, drive).isEmpty();
    }
}
