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
 * history - rather than any field on {@link Student} itself. CGPA and
 * percentage are mutually exclusive per student ({@link AcademicScoreType}):
 * only the threshold matching the student's own recorded score type is
 * checked, and the other one on the Drive is ignored entirely for that
 * student - a Drive may set either, both (to cover students recording either
 * type), or neither.
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
    private final com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository enrollmentRepository;

    public PlacementEligibilityGuard(AcademicDetailsRepository academicDetailsRepository,
                                     com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository enrollmentRepository) {
        this.academicDetailsRepository = academicDetailsRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public List<String> ineligibilityReasons(Student student, Drive drive) {
        List<String> reasons = new ArrayList<>();
        if (student == null || drive == null) {
            return reasons;
        }

        AcademicDetails academic = academicDetailsRepository.findByStudentId(student.getId()).orElse(null);

        if (academic == null) {
            if (drive.getMinCgpa() != null || drive.getMinPercentage() != null || drive.getMaxBacklogs() != null) {
                reasons.add("Academic profile incomplete (UG scores not on file)");
            }
        } else {
            if (academic.getUgScore() == null) {
                if (drive.getMinCgpa() != null || drive.getMinPercentage() != null) {
                    reasons.add("UG score not recorded on academic profile");
                }
            } else if (academic.getUgScoreType() == AcademicScoreType.CGPA) {
                if (drive.getMinCgpa() != null && academic.getUgScore() < drive.getMinCgpa()) {
                    reasons.add("CGPA below the required minimum of " + drive.getMinCgpa());
                }
            } else {
                if (drive.getMinPercentage() != null && academic.getUgScore() < drive.getMinPercentage()) {
                    reasons.add("Percentage below the required minimum of " + drive.getMinPercentage());
                }
            }

            if (drive.getMaxBacklogs() != null) {
                Integer backlogs = academic.getUgBacklogs();
                if (backlogs == null) {
                    reasons.add("Backlog count not on file (maximum allowed: " + drive.getMaxBacklogs() + ")");
                } else if (backlogs > drive.getMaxBacklogs()) {
                    reasons.add("Backlogs exceed the maximum allowed (" + drive.getMaxBacklogs() + ")");
                }
            }
        }

        if (!drive.getEligibleBatches().isEmpty()) {
            List<com.careerlabs.lms.api.batch.entity.Batch> activeBatches =
                    enrollmentRepository.findActiveBatchesByStudentId(student.getId());
            boolean matchesBatch = activeBatches.stream().anyMatch(b -> drive.getEligibleBatches().contains(b));
            if (!matchesBatch) {
                reasons.add("Not part of an eligible batch for this opportunity");
            }
        }

        if (!drive.getEligibleCourses().isEmpty()) {
            List<com.careerlabs.lms.api.enrollment.entity.Enrollment> activeEnrollments =
                    enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
            boolean matchesCourse = activeEnrollments.stream()
                    .anyMatch(e -> e.getCourse() != null && drive.getEligibleCourses().contains(e.getCourse()));
            if (!matchesCourse && (student.getCourse() == null || !drive.getEligibleCourses().contains(student.getCourse()))) {
                reasons.add("Not enrolled in an eligible course for this opportunity");
            }
        }

        return reasons;
    }

    public boolean isEligible(Student student, Drive drive) {
        return ineligibilityReasons(student, drive).isEmpty();
    }

    /**
     * True when this Drive's own criteria can't be fully evaluated because the
     * student hasn't filled in the relevant academic data yet (rather than
     * because they were evaluated and fell short) - lets the frontend show a
     * distinct "complete your profile" prompt instead of a flat "Not Eligible",
     * pointed at My Profile. Mirrors the same null-checks as
     * {@link #ineligibilityReasons}, kept separate so callers get a precise
     * boolean instead of having to pattern-match reason strings.
     */
    public boolean hasIncompleteAcademicData(Student student, Drive drive) {
        boolean scoreCriterion = drive.getMinCgpa() != null || drive.getMinPercentage() != null;
        boolean backlogCriterion = drive.getMaxBacklogs() != null;
        if (!scoreCriterion && !backlogCriterion) {
            return false;
        }

        AcademicDetails academic = academicDetailsRepository.findByStudentId(student.getId()).orElse(null);
        boolean scoreMissing = scoreCriterion
                && (academic == null || academic.getUgScoreType() == null || academic.getUgScore() == null);
        boolean backlogMissing = backlogCriterion && (academic == null || academic.getUgBacklogs() == null);
        return scoreMissing || backlogMissing;
    }
}
