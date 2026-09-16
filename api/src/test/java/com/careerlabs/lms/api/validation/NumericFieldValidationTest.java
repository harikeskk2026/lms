package com.careerlabs.lms.api.validation;

import com.careerlabs.lms.api.academic.dto.request.AcademicDetailsRequest;
import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.academic.service.impl.AcademicDetailsServiceImpl;
import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.attendance.dto.request.AttendanceGoalRequest;
import com.careerlabs.lms.api.attendance.dto.request.AttendancePolicyRequest;
import com.careerlabs.lms.api.attendance.repository.AttendancePolicyRepository;
import com.careerlabs.lms.api.attendance.service.impl.AttendancePolicyServiceImpl;
import com.careerlabs.lms.api.batch.dto.request.BatchRequest;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.placement.dto.request.CreateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateEvaluationRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateInterviewRoundRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateMockInterviewRequest;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.InterviewResult;
import com.careerlabs.lms.api.placement.entity.InterviewRoundType;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.InterviewRoundRepository;
import com.careerlabs.lms.api.placement.service.impl.DriveServiceImpl;
import com.careerlabs.lms.api.placement.service.impl.PlacementInterviewServiceImpl;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuestionRequest;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizRequest;
import com.careerlabs.lms.api.session.dto.request.SessionRequest;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.dto.request.GradeSubmissionRequest;
import com.careerlabs.lms.api.submission.entity.AssignmentSubmission;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.submission.service.impl.AssignmentSubmissionServiceImpl;
import com.careerlabs.lms.api.syllabus.importer.SyllabusImportServiceImpl;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class NumericFieldValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private <T> boolean hasViolationOnProperty(T obj, String propertyName) {
        Set<ConstraintViolation<T>> violations = validator.validate(obj);
        return violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals(propertyName));
    }

    // =========================================================================
    // 1. PLACEMENT DRIVES (minCgpa: 0-10, minPercentage: 0-100, maxBacklogs: >=0, minAttendancePct: 0-100)
    // =========================================================================
    @Nested
    @DisplayName("Placement Drive Numeric Field Validation")
    class PlacementDriveValidation {

        @Test
        @DisplayName("Valid boundaries for CreateDriveRequest pass validation")
        void testValidDriveBoundaries() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setCompanyName("Tech Corp");
            req.setRole("Engineer");
            req.setDescription("Software Engineer Drive");
            req.setDriveDate(LocalDate.now().plusDays(10));
            req.setApplyDeadline(LocalDate.now().plusDays(5));
            req.setMinCgpa(7.5);
            req.setMinPercentage(65.0);
            req.setMaxBacklogs(2);
            req.setMinAttendancePct(75.0);

            assertFalse(hasViolationOnProperty(req, "minCgpa"));
            assertFalse(hasViolationOnProperty(req, "minPercentage"));
            assertFalse(hasViolationOnProperty(req, "maxBacklogs"));
            assertFalse(hasViolationOnProperty(req, "minAttendancePct"));
        }

        @Test
        @DisplayName("minCgpa out of [0, 10] range violates Bean Validation")
        void testMinCgpaViolations() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setMinCgpa(-0.1);
            assertTrue(hasViolationOnProperty(req, "minCgpa"));

            req.setMinCgpa(10.1);
            assertTrue(hasViolationOnProperty(req, "minCgpa"));

            req.setMinCgpa(0.0);
            assertFalse(hasViolationOnProperty(req, "minCgpa"));

            req.setMinCgpa(10.0);
            assertFalse(hasViolationOnProperty(req, "minCgpa"));
        }

        @Test
        @DisplayName("minPercentage out of [0, 100] range violates Bean Validation")
        void testMinPercentageViolations() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setMinPercentage(-1.0);
            assertTrue(hasViolationOnProperty(req, "minPercentage"));

            req.setMinPercentage(100.1);
            assertTrue(hasViolationOnProperty(req, "minPercentage"));

            req.setMinPercentage(0.0);
            assertFalse(hasViolationOnProperty(req, "minPercentage"));

            req.setMinPercentage(100.0);
            assertFalse(hasViolationOnProperty(req, "minPercentage"));
        }

        @Test
        @DisplayName("maxBacklogs < 0 violates Bean Validation")
        void testMaxBacklogsViolations() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setMaxBacklogs(-1);
            assertTrue(hasViolationOnProperty(req, "maxBacklogs"));

            req.setMaxBacklogs(0);
            assertFalse(hasViolationOnProperty(req, "maxBacklogs"));
        }

        @Test
        @DisplayName("minAttendancePct out of [0, 100] violates Bean Validation")
        void testMinAttendanceViolations() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setMinAttendancePct(-0.5);
            assertTrue(hasViolationOnProperty(req, "minAttendancePct"));

            req.setMinAttendancePct(100.5);
            assertTrue(hasViolationOnProperty(req, "minAttendancePct"));

            req.setMinAttendancePct(75.0);
            assertFalse(hasViolationOnProperty(req, "minAttendancePct"));
        }

        @Test
        @DisplayName("Cross-field: applyDeadline > driveDate throws BadRequestException")
        void testDriveDatesCrossField() {
            DriveRepository mockRepo = Mockito.mock(DriveRepository.class);
            DriveServiceImpl service = new DriveServiceImpl(mockRepo, null, null, null, null, null, null);

            CreateDriveRequest req = new CreateDriveRequest();
            req.setCompanyName("Tech Corp");
            req.setRole("Engineer");
            req.setDriveDate(LocalDate.now());
            req.setApplyDeadline(LocalDate.now().plusDays(1)); // apply deadline AFTER drive date

            assertThrows(BadRequestException.class, () -> service.create(req, 1L));
        }
    }

    // =========================================================================
    // 2. INTERVIEW ROUNDS (sequence >= 1, durationMinutes: 1-600, minScore: 0-100, maxScore: 0-100)
    // =========================================================================
    @Nested
    @DisplayName("Interview Round Numeric Field Validation")
    class InterviewRoundValidation {

        @Test
        @DisplayName("Sequence, duration, and score boundaries pass Bean Validation")
        void testValidBoundaries() {
            CreateInterviewRoundRequest req = new CreateInterviewRoundRequest(
                    "Technical Round 1",
                    InterviewRoundType.TECHNICAL,
                    1,
                    "Desc",
                    50.0,
                    100.0,
                    60,
                    true,
                    "https://meet.google.com"
            );

            assertFalse(hasViolationOnProperty(req, "sequence"));
            assertFalse(hasViolationOnProperty(req, "durationMinutes"));
            assertFalse(hasViolationOnProperty(req, "minimumScore"));
            assertFalse(hasViolationOnProperty(req, "maxScore"));
        }

        @Test
        @DisplayName("sequence < 1 violates Bean Validation")
        void testSequenceViolation() {
            CreateInterviewRoundRequest req = new CreateInterviewRoundRequest(
                    "Round",
                    InterviewRoundType.TECHNICAL,
                    0, // sequence < 1
                    null,
                    50.0,
                    100.0,
                    60,
                    true,
                    null
            );
            assertTrue(hasViolationOnProperty(req, "sequence"));
        }

        @Test
        @DisplayName("durationMinutes out of [1, 600] violates Bean Validation")
        void testDurationViolation() {
            CreateInterviewRoundRequest reqLow = new CreateInterviewRoundRequest(
                    "Round", InterviewRoundType.TECHNICAL, 1, null, 50.0, 100.0, 0, true, null
            );
            assertTrue(hasViolationOnProperty(reqLow, "durationMinutes"));

            CreateInterviewRoundRequest reqHigh = new CreateInterviewRoundRequest(
                    "Round", InterviewRoundType.TECHNICAL, 1, null, 50.0, 100.0, 601, true, null
            );
            assertTrue(hasViolationOnProperty(reqHigh, "durationMinutes"));
        }

        @Test
        @DisplayName("minimumScore or maxScore out of [0, 100] violates Bean Validation")
        void testScoreViolation() {
            CreateInterviewRoundRequest reqMinNeg = new CreateInterviewRoundRequest(
                    "Round", InterviewRoundType.TECHNICAL, 1, null, -1.0, 100.0, 60, true, null
            );
            assertTrue(hasViolationOnProperty(reqMinNeg, "minimumScore"));

            CreateInterviewRoundRequest reqMaxOver = new CreateInterviewRoundRequest(
                    "Round", InterviewRoundType.TECHNICAL, 1, null, 50.0, 105.0, 60, true, null
            );
            assertTrue(hasViolationOnProperty(reqMaxOver, "maxScore"));
        }

        @Test
        @DisplayName("Cross-field: minimumScore > maxScore throws BadRequestException in service")
        void testMinimumScoreExceedsMaxScore() {
            DriveRepository driveRepo = Mockito.mock(DriveRepository.class);
            InterviewRoundRepository roundRepo = Mockito.mock(InterviewRoundRepository.class);
            Drive dummyDrive = new Drive();
            when(driveRepo.findById(1L)).thenReturn(Optional.of(dummyDrive));
            when(roundRepo.findByDrive_IdOrderBySequenceAsc(1L)).thenReturn(Collections.emptyList());

            PlacementInterviewServiceImpl service = new PlacementInterviewServiceImpl(
                    driveRepo, roundRepo, null, null, null, null, null, null
            );

            CreateInterviewRoundRequest req = new CreateInterviewRoundRequest(
                    "Technical", InterviewRoundType.TECHNICAL, 1, null, 80.0, 50.0, 60, true, null // min > max!
            );

            assertThrows(BadRequestException.class, () -> service.createRound(1L, req, 1L));
        }
    }

    // =========================================================================
    // 3. INTERVIEW EVALUATION SCORES (all 6: [0, 100])
    // =========================================================================
    @Nested
    @DisplayName("Interview Evaluation Scores Validation")
    class EvaluationScoresValidation {

        @Test
        @DisplayName("All 6 evaluation scores must be in [0, 100]")
        void testEvaluationScores() {
            CreateEvaluationRequest req = new CreateEvaluationRequest(
                    1L,
                    85.0, 90.0, 75.0, 80.0, 70.0, 80.0,
                    InterviewResult.PASS,
                    "Great candidate"
            );

            assertFalse(hasViolationOnProperty(req, "technicalScore"));
            assertFalse(hasViolationOnProperty(req, "communicationScore"));
            assertFalse(hasViolationOnProperty(req, "problemSolvingScore"));
            assertFalse(hasViolationOnProperty(req, "codingScore"));
            assertFalse(hasViolationOnProperty(req, "domainScore"));
            assertFalse(hasViolationOnProperty(req, "overallScore"));

            // Out-of-bounds checks
            CreateEvaluationRequest reqNeg = new CreateEvaluationRequest(
                    1L,
                    -0.1, 90.0, 75.0, 80.0, 70.0, 80.0,
                    InterviewResult.PASS,
                    null
            );
            assertTrue(hasViolationOnProperty(reqNeg, "technicalScore"));

            CreateEvaluationRequest reqOver = new CreateEvaluationRequest(
                    1L,
                    85.0, 90.0, 75.0, 80.0, 70.0, 100.1,
                    InterviewResult.PASS,
                    null
            );
            assertTrue(hasViolationOnProperty(reqOver, "overallScore"));
        }
    }

    // =========================================================================
    // 4. MOCK INTERVIEWS (durationMinutes: 1-600, randomCount: >= 1)
    // =========================================================================
    @Nested
    @DisplayName("Mock Interview Validation")
    class MockInterviewValidation {

        @Test
        @DisplayName("durationMinutes: [1, 600], randomCount: >= 1")
        void testMockInterviewFields() {
            CreateMockInterviewRequest req = new CreateMockInterviewRequest();
            req.setDurationMinutes(45);
            req.setRandomCount(5);

            assertFalse(hasViolationOnProperty(req, "durationMinutes"));
            assertFalse(hasViolationOnProperty(req, "randomCount"));

            req.setDurationMinutes(0);
            assertTrue(hasViolationOnProperty(req, "durationMinutes"));

            req.setDurationMinutes(601);
            assertTrue(hasViolationOnProperty(req, "durationMinutes"));

            req.setRandomCount(0);
            assertTrue(hasViolationOnProperty(req, "randomCount"));
        }
    }

    // =========================================================================
    // 5. SESSIONS (durationMinutes >= 1)
    // =========================================================================
    @Nested
    @DisplayName("Session Validation")
    class SessionValidation {

        @Test
        @DisplayName("durationMinutes must be >= 1")
        void testSessionDuration() {
            SessionRequest req = new SessionRequest();
            req.setDurationMinutes(60);
            assertFalse(hasViolationOnProperty(req, "durationMinutes"));

            req.setDurationMinutes(0);
            assertTrue(hasViolationOnProperty(req, "durationMinutes"));

            req.setDurationMinutes(-10);
            assertTrue(hasViolationOnProperty(req, "durationMinutes"));
        }
    }

    // =========================================================================
    // 6. ACADEMIC DETAILS (Passing years: 1950-2100, dynamic UG/PG scores)
    // =========================================================================
    @Nested
    @DisplayName("Academic Details Validation")
    class AcademicDetailsValidation {

        @Test
        @DisplayName("Passing years must be between 1950 and 2100")
        void testPassingYears() {
            AcademicDetailsRequest req = new AcademicDetailsRequest();
            req.setTenthYearOfPassing(2018);
            req.setTwelfthYearOfPassing(2020);
            req.setUgYearOfPassing(2024);

            assertFalse(hasViolationOnProperty(req, "tenthYearOfPassing"));
            assertFalse(hasViolationOnProperty(req, "twelfthYearOfPassing"));
            assertFalse(hasViolationOnProperty(req, "ugYearOfPassing"));

            req.setTenthYearOfPassing(1949);
            assertTrue(hasViolationOnProperty(req, "tenthYearOfPassing"));

            req.setTenthYearOfPassing(2101);
            assertTrue(hasViolationOnProperty(req, "tenthYearOfPassing"));
        }

        @Test
        @DisplayName("Percentages must be between 0 and 100")
        void testPercentages() {
            AcademicDetailsRequest req = new AcademicDetailsRequest();
            req.setTenthPercentage(85.5);
            req.setTwelfthPercentage(90.0);
            req.setDiplomaPercentage(78.0);

            assertFalse(hasViolationOnProperty(req, "tenthPercentage"));
            assertFalse(hasViolationOnProperty(req, "twelfthPercentage"));
            assertFalse(hasViolationOnProperty(req, "diplomaPercentage"));

            req.setTenthPercentage(-1.0);
            assertTrue(hasViolationOnProperty(req, "tenthPercentage"));

            req.setTenthPercentage(100.1);
            assertTrue(hasViolationOnProperty(req, "tenthPercentage"));
        }

        @Test
        @DisplayName("Backlogs must be >= 0")
        void testBacklogs() {
            AcademicDetailsRequest req = new AcademicDetailsRequest();
            req.setUgBacklogs(0);
            req.setPgBacklogs(2);

            assertFalse(hasViolationOnProperty(req, "ugBacklogs"));
            assertFalse(hasViolationOnProperty(req, "pgBacklogs"));

            req.setUgBacklogs(-1);
            assertTrue(hasViolationOnProperty(req, "ugBacklogs"));
        }

        @Test
        @DisplayName("Dynamic score validation in AcademicDetailsServiceImpl: CGPA (0-10) vs PERCENTAGE (0-100)")
        void testDynamicScoreValidationInService() {
            AcademicDetailsRepository detailsRepo = Mockito.mock(AcademicDetailsRepository.class);
            StudentRepository studentRepo = Mockito.mock(StudentRepository.class);
            Student dummyStudent = new Student();
            when(studentRepo.findById(1L)).thenReturn(Optional.of(dummyStudent));
            when(detailsRepo.findByStudentId(1L)).thenReturn(Optional.empty());
            when(detailsRepo.save(any())).thenAnswer(i -> i.getArgument(0));

            AcademicDetailsServiceImpl service = new AcademicDetailsServiceImpl(detailsRepo, studentRepo);

            // Valid CGPA: 8.5 / 10
            AcademicDetailsRequest validCgpaReq = new AcademicDetailsRequest();
            validCgpaReq.setUgScoreType(AcademicScoreType.CGPA);
            validCgpaReq.setUgScore(8.5);
            assertDoesNotThrow(() -> service.save(1L, validCgpaReq));

            // Invalid CGPA: 10.5 > 10
            AcademicDetailsRequest invalidCgpaReq = new AcademicDetailsRequest();
            invalidCgpaReq.setUgScoreType(AcademicScoreType.CGPA);
            invalidCgpaReq.setUgScore(10.5);
            BadRequestException ex1 = assertThrows(BadRequestException.class, () -> service.save(1L, invalidCgpaReq));
            assertTrue(ex1.getMessage().contains("must be between 0 and 10.0 for CGPA"));

            // Valid Percentage: 85.0 / 100
            AcademicDetailsRequest validPctReq = new AcademicDetailsRequest();
            validPctReq.setUgScoreType(AcademicScoreType.PERCENTAGE);
            validPctReq.setUgScore(85.0);
            assertDoesNotThrow(() -> service.save(1L, validPctReq));

            // Invalid Percentage: 105.0 > 100
            AcademicDetailsRequest invalidPctReq = new AcademicDetailsRequest();
            invalidPctReq.setUgScoreType(AcademicScoreType.PERCENTAGE);
            invalidPctReq.setUgScore(105.0);
            BadRequestException ex2 = assertThrows(BadRequestException.class, () -> service.save(1L, invalidPctReq));
            assertTrue(ex2.getMessage().contains("must be between 0 and 100.0 for PERCENTAGE"));

            // Missing scoreType when score is present throws BadRequestException
            AcademicDetailsRequest missingTypeReq = new AcademicDetailsRequest();
            missingTypeReq.setUgScore(8.5);
            BadRequestException ex3 = assertThrows(BadRequestException.class, () -> service.save(1L, missingTypeReq));
            assertTrue(ex3.getMessage().contains("type must be specified when score is provided"));
        }
    }

    // =========================================================================
    // 7. BATCH CAPACITY (maxStudents: 1-500)
    // =========================================================================
    @Nested
    @DisplayName("Batch Capacity Validation")
    class BatchCapacityValidation {

        @Test
        @DisplayName("maxStudents must be between 1 and 500")
        void testBatchMaxStudents() {
            BatchRequest req = new BatchRequest();
            req.setMaxStudents(50);
            assertFalse(hasViolationOnProperty(req, "maxStudents"));

            req.setMaxStudents(1);
            assertFalse(hasViolationOnProperty(req, "maxStudents"));

            req.setMaxStudents(500);
            assertFalse(hasViolationOnProperty(req, "maxStudents"));

            req.setMaxStudents(0);
            assertTrue(hasViolationOnProperty(req, "maxStudents"));

            req.setMaxStudents(501);
            assertTrue(hasViolationOnProperty(req, "maxStudents"));
        }
    }

    // =========================================================================
    // 8. ATTENDANCE POLICIES & GOALS
    // =========================================================================
    @Nested
    @DisplayName("Attendance Policy and Goal Validation")
    class AttendanceValidation {

        @Test
        @DisplayName("Policy thresholds must be between 1 and 100")
        void testPolicyThresholds() {
            AttendancePolicyRequest req = new AttendancePolicyRequest();
            req.setHealthyThreshold(75);
            req.setAtRiskThreshold(65);

            assertFalse(hasViolationOnProperty(req, "healthyThreshold"));
            assertFalse(hasViolationOnProperty(req, "atRiskThreshold"));

            req.setHealthyThreshold(0);
            assertTrue(hasViolationOnProperty(req, "healthyThreshold"));

            req.setHealthyThreshold(101);
            assertTrue(hasViolationOnProperty(req, "healthyThreshold"));

            req.setAtRiskThreshold(0);
            assertTrue(hasViolationOnProperty(req, "atRiskThreshold"));

            req.setAtRiskThreshold(101);
            assertTrue(hasViolationOnProperty(req, "atRiskThreshold"));
        }

        @Test
        @DisplayName("Cross-field: healthyThreshold <= atRiskThreshold throws BadRequestException")
        void testThresholdOrdering() {
            AttendancePolicyRepository policyRepo = Mockito.mock(AttendancePolicyRepository.class);
            BatchRepository batchRepo = Mockito.mock(BatchRepository.class);
            AttendancePolicyServiceImpl service = new AttendancePolicyServiceImpl(policyRepo, batchRepo);

            AttendancePolicyRequest req = new AttendancePolicyRequest();
            req.setHealthyThreshold(70);
            req.setAtRiskThreshold(75); // healthy < atRisk!
            assertThrows(BadRequestException.class, () -> service.upsertPolicy(req));

            req.setHealthyThreshold(70);
            req.setAtRiskThreshold(70); // healthy == atRisk!
            assertThrows(BadRequestException.class, () -> service.upsertPolicy(req));
        }

        @Test
        @DisplayName("Goal target percentage must be between 50 and 100")
        void testAttendanceGoal() {
            AttendanceGoalRequest req = new AttendanceGoalRequest();
            req.setTargetPercentage(75);
            assertFalse(hasViolationOnProperty(req, "targetPercentage"));

            req.setTargetPercentage(50);
            assertFalse(hasViolationOnProperty(req, "targetPercentage"));

            req.setTargetPercentage(100);
            assertFalse(hasViolationOnProperty(req, "targetPercentage"));

            req.setTargetPercentage(49);
            assertTrue(hasViolationOnProperty(req, "targetPercentage"));

            req.setTargetPercentage(101);
            assertTrue(hasViolationOnProperty(req, "targetPercentage"));
        }
    }

    // =========================================================================
    // 9. QUIZZES AND QUESTIONS (duration: 1-1440, passingScore: 0-100, maxAttempts: 1-100, points: >=1)
    // =========================================================================
    @Nested
    @DisplayName("Quiz and Question Validation")
    class QuizAndQuestionValidation {

        @Test
        @DisplayName("Quiz duration [1, 1440], passingScore [0, 100], maxAttempts [1, 100]")
        void testQuizBoundaries() {
            CreateQuizRequest req = new CreateQuizRequest();
            req.setTitle("Java Basics");
            req.setDuration(60);
            req.setPassingScore(70);
            req.setMaxAttempts(3);

            assertFalse(hasViolationOnProperty(req, "duration"));
            assertFalse(hasViolationOnProperty(req, "passingScore"));
            assertFalse(hasViolationOnProperty(req, "maxAttempts"));

            // Duration: [1, 1440]
            req.setDuration(0);
            assertTrue(hasViolationOnProperty(req, "duration"));
            req.setDuration(1441);
            assertTrue(hasViolationOnProperty(req, "duration"));

            // PassingScore: [0, 100]
            req.setPassingScore(-1);
            assertTrue(hasViolationOnProperty(req, "passingScore"));
            req.setPassingScore(101);
            assertTrue(hasViolationOnProperty(req, "passingScore"));

            // MaxAttempts: [1, 100]
            req.setMaxAttempts(0);
            assertTrue(hasViolationOnProperty(req, "maxAttempts"));
            req.setMaxAttempts(101);
            assertTrue(hasViolationOnProperty(req, "maxAttempts"));
        }

        @Test
        @DisplayName("Question points must be >= 1")
        void testQuestionPoints() {
            CreateQuestionRequest req = new CreateQuestionRequest();
            req.setPoints(1);
            assertFalse(hasViolationOnProperty(req, "points"));

            req.setPoints(5);
            assertFalse(hasViolationOnProperty(req, "points"));

            req.setPoints(0);
            assertTrue(hasViolationOnProperty(req, "points"));

            req.setPoints(-2);
            assertTrue(hasViolationOnProperty(req, "points"));
        }
    }

    // =========================================================================
    // 10. ASSIGNMENT MARKS (0 <= marks <= totalMarks)
    // =========================================================================
    @Nested
    @DisplayName("Assignment Marks Validation")
    class AssignmentMarksValidation {

        @Test
        @DisplayName("GradeSubmissionRequest marks must be >= 0")
        void testGradeRequestMinMarks() {
            GradeSubmissionRequest req = new GradeSubmissionRequest();
            req.setMarks(80);
            assertFalse(hasViolationOnProperty(req, "marks"));

            req.setMarks(0);
            assertFalse(hasViolationOnProperty(req, "marks"));

            req.setMarks(-5);
            assertTrue(hasViolationOnProperty(req, "marks"));
        }

        @Test
        @DisplayName("Cross-field: marks cannot exceed assignment totalMarks")
        void testMarksCannotExceedTotalMarks() {
            AssignmentSubmissionRepository subRepo = Mockito.mock(AssignmentSubmissionRepository.class);
            AssignmentSubmissionServiceImpl service = new AssignmentSubmissionServiceImpl(
                    subRepo, null, null, null, null, null, null
            );

            Assignment assignment = new Assignment();
            ReflectionTestUtils.setField(assignment, "id", 1L);
            assignment.setTotalMarks(50); // Total marks = 50

            AssignmentSubmission sub = new AssignmentSubmission();
            ReflectionTestUtils.setField(sub, "id", 10L);
            sub.setAssignment(assignment);

            when(subRepo.findById(10L)).thenReturn(Optional.of(sub));

            GradeSubmissionRequest req = new GradeSubmissionRequest();
            req.setMarks(55); // 55 > 50!

            BadRequestException ex = assertThrows(BadRequestException.class, () -> service.grade(1L, 10L, req));
            assertTrue(ex.getMessage().contains("Marks cannot exceed the assignment's total marks (50)"));
        }
    }

    // =========================================================================
    // 11. LEXICAL EDGE CASES (String format rejection on integer import fields)
    // =========================================================================
    @Nested
    @DisplayName("Lexical Edge Cases for Integer String Parsing")
    class LexicalEdgeCases {

        private boolean invokeIsValidIntegerString(String input) throws Exception {
            Method m = SyllabusImportServiceImpl.class.getDeclaredMethod("isValidIntegerString", String.class);
            m.setAccessible(true);
            return (boolean) m.invoke(null, input);
        }

        @ParameterizedTest
        @ValueSource(strings = {
                "-1", "+1", "-0", "+0", "01", "001", "0",
                "1.0", "1.00", "10.5",
                "1e3", "1E3", "2e-1",
                "1abc", "abc1", "1 0",
                "", "   "
        })
        @DisplayName("All lexical edge cases and malformed strings are strictly rejected")
        void testInvalidIntegerStrings(String input) throws Exception {
            assertFalse(invokeIsValidIntegerString(input), "Must reject lexical edge case: '" + input + "'");
        }

        @ParameterizedTest
        @ValueSource(strings = {"1", "5", "10", "100", "500", "1440"})
        @DisplayName("Valid positive integer strings are accepted")
        void testValidIntegerStrings(String input) throws Exception {
            assertTrue(invokeIsValidIntegerString(input), "Must accept valid integer: '" + input + "'");
        }

        @Test
        @DisplayName("Null input is safely rejected")
        void testNullString() throws Exception {
            assertFalse(invokeIsValidIntegerString(null));
        }
    }

    // =========================================================================
    // 12. DIRECT API BYPASS TESTS (Explicit user checklist for server security boundary)
    // =========================================================================
    @Nested
    @DisplayName("Direct API Bypass Tests")
    class DirectApiBypassValidation {

        @Test
        @DisplayName("Direct API Bypass: negative batch capacity is rejected")
        void testNegativeBatchCapacityBypass() {
            BatchRequest req = new BatchRequest();
            req.setMaxStudents(-10);
            assertTrue(hasViolationOnProperty(req, "maxStudents"));
        }

        @Test
        @DisplayName("Direct API Bypass: batch capacity 501 is rejected")
        void testBatchCapacity501Bypass() {
            BatchRequest req = new BatchRequest();
            req.setMaxStudents(501);
            assertTrue(hasViolationOnProperty(req, "maxStudents"));
        }

        @Test
        @DisplayName("Direct API Bypass: quiz duration 0 / 1441 is rejected")
        void testQuizDuration0And1441Bypass() {
            CreateQuizRequest req0 = new CreateQuizRequest();
            req0.setDuration(0);
            assertTrue(hasViolationOnProperty(req0, "duration"));

            CreateQuizRequest req1441 = new CreateQuizRequest();
            req1441.setDuration(1441);
            assertTrue(hasViolationOnProperty(req1441, "duration"));
        }

        @Test
        @DisplayName("Direct API Bypass: quiz passing score -1 / 101 is rejected")
        void testQuizPassingScoreNeg1And101Bypass() {
            CreateQuizRequest reqNeg = new CreateQuizRequest();
            reqNeg.setPassingScore(-1);
            assertTrue(hasViolationOnProperty(reqNeg, "passingScore"));

            CreateQuizRequest reqOver = new CreateQuizRequest();
            reqOver.setPassingScore(101);
            assertTrue(hasViolationOnProperty(reqOver, "passingScore"));
        }

        @Test
        @DisplayName("Direct API Bypass: question points 0 is rejected")
        void testQuestionPoints0Bypass() {
            CreateQuestionRequest req = new CreateQuestionRequest();
            req.setPoints(0);
            assertTrue(hasViolationOnProperty(req, "points"));
        }

        @Test
        @DisplayName("Direct API Bypass: round duration 0 / 601 is rejected")
        void testRoundDuration0And601Bypass() {
            CreateInterviewRoundRequest req0 = new CreateInterviewRoundRequest(
                    "R", InterviewRoundType.TECHNICAL, 1, null, 50.0, 100.0, 0, true, null
            );
            assertTrue(hasViolationOnProperty(req0, "durationMinutes"));

            CreateInterviewRoundRequest req601 = new CreateInterviewRoundRequest(
                    "R", InterviewRoundType.TECHNICAL, 1, null, 50.0, 100.0, 601, true, null
            );
            assertTrue(hasViolationOnProperty(req601, "durationMinutes"));
        }

        @Test
        @DisplayName("Direct API Bypass: mock duration 0 / 601 is rejected")
        void testMockDuration0And601Bypass() {
            CreateMockInterviewRequest req0 = new CreateMockInterviewRequest();
            req0.setDurationMinutes(0);
            assertTrue(hasViolationOnProperty(req0, "durationMinutes"));

            CreateMockInterviewRequest req601 = new CreateMockInterviewRequest();
            req601.setDurationMinutes(601);
            assertTrue(hasViolationOnProperty(req601, "durationMinutes"));
        }

        @Test
        @DisplayName("Direct API Bypass: drive CGPA > 10 is rejected")
        void testDriveCgpaOver10Bypass() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setMinCgpa(10.1);
            assertTrue(hasViolationOnProperty(req, "minCgpa"));
        }

        @Test
        @DisplayName("Direct API Bypass: drive percentage > 100 is rejected")
        void testDrivePercentageOver100Bypass() {
            CreateDriveRequest req = new CreateDriveRequest();
            req.setMinPercentage(100.1);
            assertTrue(hasViolationOnProperty(req, "minPercentage"));
        }

        @Test
        @DisplayName("Direct API Bypass: negative backlogs are rejected")
        void testNegativeBacklogsBypass() {
            CreateDriveRequest driveReq = new CreateDriveRequest();
            driveReq.setMaxBacklogs(-1);
            assertTrue(hasViolationOnProperty(driveReq, "maxBacklogs"));

            AcademicDetailsRequest acadReq = new AcademicDetailsRequest();
            acadReq.setUgBacklogs(-2);
            assertTrue(hasViolationOnProperty(acadReq, "ugBacklogs"));
        }

        @Test
        @DisplayName("Direct API Bypass: invalid evaluation scores are rejected")
        void testInvalidEvaluationScoresBypass() {
            CreateEvaluationRequest req = new CreateEvaluationRequest(
                    1L, -1.0, 105.0, 50.0, 50.0, 50.0, 50.0, InterviewResult.PASS, null
            );
            assertTrue(hasViolationOnProperty(req, "technicalScore"));
            assertTrue(hasViolationOnProperty(req, "communicationScore"));
        }

        @Test
        @DisplayName("Direct API Bypass: invalid academic year (< 1950 or > 2100) is rejected")
        void testInvalidAcademicYearBypass() {
            AcademicDetailsRequest reqLow = new AcademicDetailsRequest();
            reqLow.setTenthYearOfPassing(1949);
            assertTrue(hasViolationOnProperty(reqLow, "tenthYearOfPassing"));

            AcademicDetailsRequest reqHigh = new AcademicDetailsRequest();
            reqHigh.setTenthYearOfPassing(2101);
            assertTrue(hasViolationOnProperty(reqHigh, "tenthYearOfPassing"));
        }

        @Test
        @DisplayName("Direct API Bypass: invalid academic percentage (< 0 or > 100) is rejected")
        void testInvalidAcademicPercentageBypass() {
            AcademicDetailsRequest reqLow = new AcademicDetailsRequest();
            reqLow.setTenthPercentage(-0.1);
            assertTrue(hasViolationOnProperty(reqLow, "tenthPercentage"));

            AcademicDetailsRequest reqHigh = new AcademicDetailsRequest();
            reqHigh.setTenthPercentage(100.1);
            assertTrue(hasViolationOnProperty(reqHigh, "tenthPercentage"));
        }

        @Test
        @DisplayName("Direct API Bypass: CGPA score > 10 when scoreType=CGPA is rejected by service")
        void testCgpaOver10WhenScoreTypeCgpaBypass() {
            AcademicDetailsRepository detailsRepo = Mockito.mock(AcademicDetailsRepository.class);
            StudentRepository studentRepo = Mockito.mock(StudentRepository.class);
            when(studentRepo.findById(1L)).thenReturn(Optional.of(new Student()));
            AcademicDetailsServiceImpl service = new AcademicDetailsServiceImpl(detailsRepo, studentRepo);

            AcademicDetailsRequest req = new AcademicDetailsRequest();
            req.setUgScoreType(AcademicScoreType.CGPA);
            req.setUgScore(10.5); // > 10!

            BadRequestException ex = assertThrows(BadRequestException.class, () -> service.save(1L, req));
            assertTrue(ex.getMessage().contains("must be between 0 and 10.0 for CGPA"));
        }

        @Test
        @DisplayName("Direct API Bypass: assignment marks > totalMarks is rejected by service")
        void testAssignmentMarksOverTotalMarksBypass() {
            AssignmentSubmissionRepository subRepo = Mockito.mock(AssignmentSubmissionRepository.class);
            AssignmentSubmissionServiceImpl service = new AssignmentSubmissionServiceImpl(
                    subRepo, null, null, null, null, null, null
            );

            Assignment assignment = new Assignment();
            ReflectionTestUtils.setField(assignment, "id", 1L);
            assignment.setTotalMarks(50);

            AssignmentSubmission sub = new AssignmentSubmission();
            ReflectionTestUtils.setField(sub, "id", 10L);
            sub.setAssignment(assignment);

            when(subRepo.findById(10L)).thenReturn(Optional.of(sub));

            GradeSubmissionRequest req = new GradeSubmissionRequest();
            req.setMarks(75); // 75 > 50!

            BadRequestException ex = assertThrows(BadRequestException.class, () -> service.grade(1L, 10L, req));
            assertTrue(ex.getMessage().contains("Marks cannot exceed the assignment's total marks (50)"));
        }
    }
}
