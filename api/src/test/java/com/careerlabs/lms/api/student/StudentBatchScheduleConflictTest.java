package com.careerlabs.lms.api.student;

import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceAlertRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceGoalRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationStatusHistoryRepository;
import com.careerlabs.lms.api.placement.repository.ResumeDataRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.StudentAchievementRepository;
import com.careerlabs.lms.api.quiz.repository.StudentGameStatsRepository;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackSessionRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.student.service.impl.StudentServiceImpl;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentBatchScheduleConflictTest {

    @Mock StudentRepository studentRepository;
    @Mock UserRepository userRepository;
    @Mock BatchRepository batchRepository;
    @Mock CourseRepository courseRepository;
    @Mock CollegeRepository collegeRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AttendanceCorrectionRepository attendanceCorrectionRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock AttendanceAlertRepository attendanceAlertRepository;
    @Mock AttendanceGoalRepository attendanceGoalRepository;
    @Mock AssignmentSubmissionRepository assignmentSubmissionRepository;
    @Mock AnnouncementViewRepository announcementViewRepository;
    @Mock AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository;
    @Mock AnnouncementCommentRepository announcementCommentRepository;
    @Mock DriveApplicationStatusHistoryRepository driveApplicationStatusHistoryRepository;
    @Mock DriveApplicationRepository driveApplicationRepository;
    @Mock ResumeDataRepository resumeDataRepository;
    @Mock AcademicDetailsRepository academicDetailsRepository;
    @Mock QuestionAttemptRepository questionAttemptRepository;
    @Mock QuizAttemptRepository quizAttemptRepository;
    @Mock StudentGameStatsRepository studentGameStatsRepository;
    @Mock StudentAchievementRepository studentAchievementRepository;
    @Mock PlaybackSessionRepository playbackSessionRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock PlatformTransactionManager transactionManager;

    BatchScheduleConflictValidator validator;
    StudentServiceImpl studentService;

    Course course1, course2;
    Batch existingBatch, conflictingBatch, nonConflictingTimeBatch, nonConflictingDateBatch;
    Student student;
    User studentUser;

    void setId(Object o, Long id){ ReflectionTestUtils.setField(o,"id",id); }

    Batch makeBatch(Long id, String name, Course course, LocalDate start, LocalDate end, String timing){
        Batch b = new Batch();
        setId(b, id);
        b.setName(name);
        b.setCourse(course);
        b.setStartDate(start);
        b.setEndDate(end);
        b.setTiming(timing);
        b.setActive(true);
        b.setMaxStudents(30);
        return b;
    }
    Course makeCourse(Long id, String title){
        Course c = new Course();
        setId(c, id);
        c.setTitle(title);
        c.setStatus(CourseStatus.PUBLISHED);
        c.setDescription("desc");
        c.setDuration("6 months");
        return c;
    }
    Enrollment makeEnrollment(Long id, Student s, Course c, Batch b, boolean active){
        Enrollment e = new Enrollment();
        setId(e, id);
        e.setStudent(s);
        e.setCourse(c);
        e.setBatch(b);
        e.setActive(active);
        return e;
    }

    @BeforeEach
    void setUp(){
        validator = new BatchScheduleConflictValidator(enrollmentRepository);
        studentService = new StudentServiceImpl(studentRepository, userRepository, batchRepository, courseRepository, collegeRepository,
                enrollmentRepository, validator, passwordEncoder,
                attendanceCorrectionRepository, attendanceRepository, attendanceAlertRepository, attendanceGoalRepository,
                assignmentSubmissionRepository, announcementViewRepository, announcementAcknowledgmentRepository, announcementCommentRepository,
                driveApplicationStatusHistoryRepository, driveApplicationRepository, resumeDataRepository, academicDetailsRepository,
                questionAttemptRepository, quizAttemptRepository, studentGameStatsRepository, studentAchievementRepository,
                playbackSessionRepository, notificationRepository, transactionManager);

        course1 = makeCourse(10L, "Java");
        course2 = makeCourse(20L, "Python");
        existingBatch = makeBatch(100L, "Batch A", course1, LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM");
        conflictingBatch = makeBatch(200L, "Batch B", course2, LocalDate.of(2026,9,15), LocalDate.of(2026,10,15), "10:00 AM - 01:00 PM");
        nonConflictingTimeBatch = makeBatch(201L, "Batch C", course2, LocalDate.of(2026,9,15), LocalDate.of(2026,10,15), "02:00 PM - 05:00 PM");
        nonConflictingDateBatch = makeBatch(202L, "Batch D", course2, LocalDate.of(2026,10,1), LocalDate.of(2026,10,31), "09:00 AM - 12:00 PM");

        studentUser = new User();
        setId(studentUser, 500L);
        studentUser.setName("Test Student");
        studentUser.setEmail("test@student.com");
        studentUser.setActive(true);

        student = new Student();
        setId(student, 1L);
        student.setUser(studentUser);
        student.setEnrollmentNo("CL-2026-0001");
    }

    @Test
    @DisplayName("assignToBatch overlapping batch -> Reject via enrollments")
    void assignToBatch_conflict_reject(){
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(conflictingBatch));
        when(studentRepository.findByBatchId(200L)).thenReturn(List.of());
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));

        assertThrows(ConflictException.class, () -> studentService.assignToBatch(1L, 200L));
        verify(studentRepository, never()).save(any());
    }

    @Test
    @DisplayName("assignToBatch overlapping dates but different timing -> Allow")
    void assignToBatch_differentTiming_allow(){
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(batchRepository.findById(201L)).thenReturn(Optional.of(nonConflictingTimeBatch));
        when(studentRepository.findByBatchId(201L)).thenReturn(List.of());
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> studentService.assignToBatch(1L, 201L));
        verify(studentRepository).save(any(Student.class));
    }

    @Test
    @DisplayName("assignToBatch same timing but non-overlapping dates -> Allow")
    void assignToBatch_nonOverlappingDates_allow(){
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(batchRepository.findById(202L)).thenReturn(Optional.of(nonConflictingDateBatch));
        when(studentRepository.findByBatchId(202L)).thenReturn(List.of());
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> studentService.assignToBatch(1L, 202L));
    }

    @Test
    @DisplayName("assignToBatch with inactive existing batch -> Allow")
    void assignToBatch_inactiveExisting_allow(){
        Batch inactive = makeBatch(100L, "Batch A", course1, LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM");
        inactive.setActive(false);
        Enrollment existing = makeEnrollment(1L, student, course1, inactive, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(conflictingBatch));
        when(studentRepository.findByBatchId(200L)).thenReturn(List.of());
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> studentService.assignToBatch(1L, 200L));
    }

    @Test
    @DisplayName("assignToBatch with no existing enrollments -> Allow")
    void assignToBatch_noExisting_allow(){
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(batchRepository.findById(200L)).thenReturn(Optional.of(conflictingBatch));
        when(studentRepository.findByBatchId(200L)).thenReturn(List.of());
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of());
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> studentService.assignToBatch(1L, 200L));
    }

    @Test
    @DisplayName("assignToBatch same batch id -> no validation, allow")
    void assignToBatch_sameBatch_allow(){
        student.setBatch(existingBatch);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> studentService.assignToBatch(1L, 100L));
    }
}
