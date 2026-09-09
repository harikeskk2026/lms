package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnouncementAudienceServiceImplTest {

    @Mock
    private StudentRepository studentRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private AssignmentSubmissionRepository submissionRepository;

    @InjectMocks
    private AnnouncementAudienceServiceImpl audienceService;

    private Batch batch;
    private College college;
    private Course course;
    private Student student;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        batch = new Batch();
        setId(batch, 1L);
        college = new College();
        setId(college, 2L);
        course = new Course();
        setId(course, 3L);

        student = new Student();
        setId(student, 100L);
        student.setBatch(batch);
        student.setCollege(college);
        student.setCourse(course);
    }

    @Test
    @DisplayName("A student matching batch/college/course with no rule is eligible")
    void eligibleWhenAllStructuralFiltersMatch() {
        Announcement a = new Announcement();
        a.setBatch(batch);
        a.setCollege(college);
        a.setCourse(course);
        a.setAudienceRuleType(AudienceRuleType.NONE);

        assertTrue(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("A global announcement (no structural filters) reaches every student")
    void eligibleForGlobalAnnouncement() {
        Announcement a = new Announcement();
        a.setAudienceRuleType(AudienceRuleType.NONE);

        assertTrue(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("Batch mismatch denies")
    void batchMismatchDenies() {
        Batch other = new Batch();
        setId(other, 99L);
        Announcement a = new Announcement();
        a.setBatch(other);

        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("College mismatch denies")
    void collegeMismatchDenies() {
        College other = new College();
        setId(other, 98L);
        Announcement a = new Announcement();
        a.setCollege(other);

        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("Course mismatch denies")
    void courseMismatchDenies() {
        Course other = new Course();
        setId(other, 97L);
        Announcement a = new Announcement();
        a.setCourse(other);

        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("FAIL CLOSED: rule evaluation failure denies access, never grants it")
    void ruleEvaluationFailureDenies() {
        Announcement a = new Announcement();
        a.setAudienceRuleType(AudienceRuleType.ATTENDANCE_BELOW);
        a.setAudienceRuleValue(80.0);

        when(attendanceRepository.countByStudentId(100L)).thenThrow(new RuntimeException("database down"));

        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("ATTENDANCE_BELOW matches only students with attendance under the threshold")
    void attendanceBelowRule() {
        Announcement a = new Announcement();
        a.setAudienceRuleType(AudienceRuleType.ATTENDANCE_BELOW);
        a.setAudienceRuleValue(80.0);

        when(attendanceRepository.countByStudentId(100L)).thenReturn(10L);
        when(attendanceRepository.countByStudentIdAndStatus(eq(100L), any())).thenReturn(7L);

        assertTrue(audienceService.isEligible(a, student));

        // 9 out of 10 present = 90% -> above the 80% threshold -> not a recipient
        when(attendanceRepository.countByStudentIdAndStatus(eq(100L), any())).thenReturn(9L);

        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("PLACEMENT_ELIGIBLE matches only students currently seeking placement")
    void placementEligibleRule() {
        Announcement a = new Announcement();
        a.setAudienceRuleType(AudienceRuleType.PLACEMENT_ELIGIBLE);

        student.setPlacementStatus(PlacementStatus.SEEKING);
        assertTrue(audienceService.isEligible(a, student));

        student.setPlacementStatus(PlacementStatus.PLACED);
        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("ASSIGNMENT_NOT_SUBMITTED matches only students with no submission for the assignment")
    void assignmentNotSubmittedRule() {
        Announcement a = new Announcement();
        a.setAudienceRuleType(AudienceRuleType.ASSIGNMENT_NOT_SUBMITTED);
        a.setAudienceRuleReferenceId(9L);

        when(submissionRepository.findByAssignmentIdAndStudentId(9L, 100L))
                .thenReturn(Optional.empty());
        assertTrue(audienceService.isEligible(a, student));

        when(submissionRepository.findByAssignmentIdAndStudentId(9L, 100L))
                .thenReturn(Optional.of(new AssignmentSubmission()));
        assertFalse(audienceService.isEligible(a, student));
    }

    @Test
    @DisplayName("isUserEligible: a user without a student profile is never eligible")
    void isUserEligibleWithoutStudentProfileDenies() {
        Announcement a = new Announcement();
        when(studentRepository.findByUserId(55L)).thenReturn(Optional.empty());

        assertFalse(audienceService.isUserEligible(a, 55L));
    }

    @Test
    @DisplayName("isUserEligible: null user id denies")
    void isUserEligibleWithNullUserIdDenies() {
        assertFalse(audienceService.isUserEligible(new Announcement(), null));
    }

    @Test
    @DisplayName("FAIL CLOSED: student-lookup failure resolves to denied")
    void isUserEligibleLookupFailureDenies() {
        Announcement a = new Announcement();
        when(studentRepository.findByUserId(55L)).thenThrow(new RuntimeException("database down"));

        assertFalse(audienceService.isUserEligible(a, 55L));
    }

    @Test
    @DisplayName("isUserEligible: eligible when the user's student profile matches the audience")
    void isUserEligibleAllows() {
        Announcement a = new Announcement();
        a.setBatch(batch);
        a.setAudienceRuleType(AudienceRuleType.NONE);

        when(studentRepository.findByUserId(55L)).thenReturn(Optional.of(student));

        assertTrue(audienceService.isUserEligible(a, 55L));
    }

    @Test
    @DisplayName("countEligibleStudents counts exactly the resolved candidates")
    void countEligibleStudentsCountsResolvedCandidates() {
        Announcement a = new Announcement();
        a.setAudienceRuleType(AudienceRuleType.NONE);

        Student other = new Student();
        setId(other, 101L);
        other.setBatch(batch);

        when(studentRepository.findAll(any(Specification.class))).thenReturn(List.of(student, other));

        assertEquals(2, audienceService.countEligibleStudents(a));
    }

    @Test
    @DisplayName("countEligibleStudents of null returns zero")
    void countEligibleStudentsOfNull() {
        assertEquals(0, audienceService.countEligibleStudents(null));
    }
}