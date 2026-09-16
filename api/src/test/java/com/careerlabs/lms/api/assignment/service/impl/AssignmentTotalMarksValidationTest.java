package com.careerlabs.lms.api.assignment.service.impl;

import com.careerlabs.lms.api.assignment.dto.request.AssignmentRequest;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssignmentTotalMarksValidationTest {

    @Mock private AssignmentRepository assignmentRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private BatchRepository batchRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private StudentRepository studentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private AssignmentSubmissionRepository submissionRepository;
    @Mock private NotificationService notificationService;
    @Mock private UserRepository userRepository;

    private AssignmentServiceImpl assignmentService;
    private JwtUserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        assignmentService = new AssignmentServiceImpl(
                assignmentRepository,
                courseRepository,
                batchRepository,
                fileStorageService,
                studentRepository,
                enrollmentRepository,
                submissionRepository,
                notificationService,
                userRepository
        );
        adminPrincipal = new JwtUserPrincipal(1L, "admin@careerlabs.com", "ADMIN");
    }

    private AssignmentRequest createBaseRequest() {
        AssignmentRequest request = new AssignmentRequest();
        request.setTitle("Java Basics Assignment");
        request.setDescription("Complete the Java OOP exercises");
        request.setCourseId(10L);
        request.setBatchId(20L);
        request.setStartDate(LocalDate.now());
        request.setPublishTime(LocalTime.of(9, 0));
        request.setDueDate(LocalDate.now().plusDays(7));
        request.setCloseTime(LocalTime.of(18, 0));
        request.setStatus(AssignmentStatus.PUBLISHED);
        return request;
    }

    @Test
    @DisplayName("Total marks = null should be accepted and default to 100")
    void totalMarks_null_isAccepted() {
        AssignmentRequest request = createBaseRequest();
        request.setTotalMarks(null);

        when(courseRepository.findById(10L)).thenReturn(Optional.of(new Course()));
        when(batchRepository.findById(20L)).thenReturn(Optional.of(new Batch()));
        when(assignmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> assignmentService.create(request, adminPrincipal));
    }

    @Test
    @DisplayName("Total marks = 0 should be rejected with exact error message")
    void totalMarks_zero_throwsBadRequestException() {
        AssignmentRequest request = createBaseRequest();
        request.setTotalMarks(0);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                assignmentService.create(request, adminPrincipal)
        );

        assertEquals("Total marks must be between 1 and 100.", ex.getMessage());
    }

    @Test
    @DisplayName("Total marks = 101 or 1000 should be rejected with exact error message")
    void totalMarks_greaterThan100_throwsBadRequestException() {
        AssignmentRequest request = createBaseRequest();
        request.setTotalMarks(1000);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                assignmentService.create(request, adminPrincipal)
        );

        assertEquals("Total marks must be between 1 and 100.", ex.getMessage());
    }

    @Test
    @DisplayName("Total marks = negative value should be rejected with exact error message")
    void totalMarks_negative_throwsBadRequestException() {
        AssignmentRequest request = createBaseRequest();
        request.setTotalMarks(-50);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                assignmentService.create(request, adminPrincipal)
        );

        assertEquals("Total marks must be between 1 and 100.", ex.getMessage());
    }

    @Test
    @DisplayName("Total marks between 1 and 100 (e.g. 100) should be accepted")
    void totalMarks_valid_isAccepted() {
        AssignmentRequest request = createBaseRequest();
        request.setTotalMarks(100);

        when(courseRepository.findById(10L)).thenReturn(Optional.of(new Course()));
        when(batchRepository.findById(20L)).thenReturn(Optional.of(new Batch()));
        when(assignmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> assignmentService.create(request, adminPrincipal));
    }
}
