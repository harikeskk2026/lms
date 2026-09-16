package com.careerlabs.lms.api.report;

import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.report.dto.request.PerformanceReportRequest;
import com.careerlabs.lms.api.report.dto.response.PerformanceReportResponse;
import com.careerlabs.lms.api.report.dto.response.ReportStudentResponse;
import com.careerlabs.lms.api.report.service.impl.ReportServiceImpl;
import com.careerlabs.lms.api.report.validation.ReportValidator;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies that batch roster performance metrics (attendance %, average quiz score)
 * are computed only from activity belonging to the selected batch/course, never from
 * the student's lifetime LMS activity.
 */
@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock BatchRepository batchRepository;
    @Mock CourseRepository courseRepository;
    @Mock StudentRepository studentRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock AssignmentRepository assignmentRepository;
    @Mock AssignmentSubmissionRepository submissionRepository;
    @Mock QuizAttemptRepository quizAttemptRepository;
    @Mock QuizRepository quizRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock DailyClassRepository dailyClassRepository;

    ReportServiceImpl reportService;

    Course course2;
    Batch currentBatch;
    Student student;
    DailyClass currentClass;

    void setId(Object o, Long id) {
        ReflectionTestUtils.setField(o, "id", id);
    }

    Course makeCourse(Long id, String title) {
        Course c = new Course();
        setId(c, id);
        c.setTitle(title);
        c.setDescription("desc");
        c.setDuration("6 months");
        c.setStatus(CourseStatus.PUBLISHED);
        return c;
    }

    Batch makeBatch(Long id, String name, Course course) {
        Batch b = new Batch();
        setId(b, id);
        b.setName(name);
        b.setCourse(course);
        b.setMaxStudents(30);
        b.setActive(true);
        return b;
    }

    DailyClass makeClass(Long id, Batch batch) {
        DailyClass c = new DailyClass();
        setId(c, id);
        c.setBatch(batch);
        c.setDate(LocalDateTime.of(2026, 9, 1, 10, 0));
        c.setTitle("Class " + id);
        c.setStatus(ClassStatus.COMPLETED);
        return c;
    }

    Attendance makeAttendance(Long id, Student student, DailyClass dailyClass, AttendStatus status) {
        Attendance a = new Attendance();
        setId(a, id);
        a.setStudent(student);
        a.setDailyClass(dailyClass);
        a.setStatus(status);
        return a;
    }

    Quiz makeQuiz(Long id, Long courseId, Long batchId) {
        Quiz q = new Quiz();
        setId(q, id);
        q.setTitle("Quiz " + id);
        q.setCourseId(courseId);
        q.setBatchId(batchId);
        return q;
    }

    QuizAttempt makeAttempt(Long id, Quiz quiz, Long studentId, double accuracy) {
        QuizAttempt attempt = new QuizAttempt();
        setId(attempt, id);
        attempt.setQuiz(quiz);
        attempt.setStudentId(studentId);
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setAccuracy(accuracy);
        return attempt;
    }

    @BeforeEach
    void setUp() {
        ReportValidator validator = new ReportValidator(batchRepository, courseRepository, studentRepository);
        reportService = new ReportServiceImpl(batchRepository, courseRepository, studentRepository,
                enrollmentRepository, assignmentRepository, submissionRepository, quizAttemptRepository,
                quizRepository, attendanceRepository, dailyClassRepository, validator);

        course2 = makeCourse(2L, "React Bootcamp");
        currentBatch = makeBatch(200L, "Batch 2", course2);
        currentClass = makeClass(200L, currentBatch);

        User user = new User();
        setId(user, 500L);
        user.setName("Test Student");
        user.setEmail("test@student.com");
        user.setActive(true);

        student = new Student();
        setId(student, 10L);
        student.setUser(user);
        student.setEnrollmentNo("CL-2026-0001");
    }

    private PerformanceReportResponse reportFor(Long batchId) {
        PerformanceReportRequest request = new PerformanceReportRequest();
        request.setBatchId(batchId);
        return reportService.getPerformanceReport(request);
    }

    private ReportStudentResponse rowFor(PerformanceReportResponse response) {
        return response.students().stream()
                .filter(r -> r.studentId().equals(student.getId()))
                .findFirst()
                .orElseThrow();
    }

    @Test
    @DisplayName("Attendance is scoped to the batch's classes - previous-batch attendance is ignored")
    void previousBatchAttendance_ignored() {
        Course course1 = makeCourse(1L, "Java Bootcamp");
        Batch previousBatch = makeBatch(100L, "Batch 1", course1);
        DailyClass previousClass = makeClass(100L, previousBatch);

        // Lifetime history: PRESENT in the previous batch, ABSENT in the current batch.
        List<Attendance> currentScan = List.of(makeAttendance(2L, student, currentClass, AttendStatus.ABSENT));
        // If lifetime history were used (previous behavior), this PRESENT record would inflate the percentage.
        List<Attendance> lifetime = List.of(
                makeAttendance(1L, student, previousClass, AttendStatus.PRESENT),
                makeAttendance(2L, student, currentClass, AttendStatus.ABSENT));

        when(batchRepository.existsById(200L)).thenReturn(true);
        when(batchRepository.findById(200L)).thenReturn(java.util.Optional.of(currentBatch));
        when(enrollmentRepository.findActiveStudentsByBatchId(200L)).thenReturn(List.of(student));
        when(quizRepository.findIdsByBatchId(200L)).thenReturn(List.of());
        when(quizRepository.findCourseLevelIdsByCourseId(2L)).thenReturn(List.of());
        when(attendanceRepository.findByStudentIdInAndDailyClassBatchId(List.of(10L), 200L)).thenReturn(currentScan);

        ReportStudentResponse row = rowFor(reportFor(200L));

        assertEquals(0.0, row.attendancePct());
        assertNull(row.avgQuizScore());
        // The repository-level batch filter is used, not the lifetime history query.
        verify(attendanceRepository).findByStudentIdInAndDailyClassBatchId(List.of(10L), 200L);
        verify(attendanceRepository, never()).findByStudentIdIn(anyList());
    }

    @Test
    @DisplayName("Quiz attempts are scoped to quizzes of the batch/course - other-course attempts are excluded")
    void previousCourseQuizAttempts_ignored() {
        Course course1 = makeCourse(1L, "Java Bootcamp");
        Batch previousBatch = makeBatch(100L, "Batch 1", course1);
        Quiz previousCourseQuiz = makeQuiz(201L, 1L, 100L);     // belongs to the previous batch/course
        Quiz currentBatchQuiz = makeQuiz(300L, 2L, 200L);       // batch-specific quiz of current batch
        Quiz currentCourseQuiz = makeQuiz(301L, 2L, null);      // course-wide quiz of current batch's course

        // The student has a high-scoring attempt on the previous course's quiz.
        QuizAttempt previousAttempt = makeAttempt(1L, previousCourseQuiz, 10L, 95.0);
        // Current-batch activity: only the course-wide quiz attempt counts.
        QuizAttempt currentAttempt = makeAttempt(2L, currentCourseQuiz, 10L, 90.0);

        when(batchRepository.existsById(200L)).thenReturn(true);
        when(batchRepository.findById(200L)).thenReturn(java.util.Optional.of(currentBatch));
        when(enrollmentRepository.findActiveStudentsByBatchId(200L)).thenReturn(List.of(student));
        when(quizRepository.findIdsByBatchId(200L)).thenReturn(List.of(300L));
        when(quizRepository.findCourseLevelIdsByCourseId(2L)).thenReturn(List.of(301L));
        when(quizAttemptRepository.findByStudentIdInAndQuizIdInAndStatus(eq(List.of(10L)), anyCollection(),
                eq(AttemptStatus.SUBMITTED))).thenReturn(List.of(currentAttempt));
        when(attendanceRepository.findByStudentIdInAndDailyClassBatchId(List.of(10L), 200L)).thenReturn(List.of());

        ReportStudentResponse row = rowFor(reportFor(200L));

        assertEquals(90.0, row.avgQuizScore());
        assertNull(row.attendancePct());

        ArgumentCaptor<List<Long>> quizIdsCaptor = ArgumentCaptor.forClass(List.class);
        verify(quizAttemptRepository).findByStudentIdInAndQuizIdInAndStatus(eq(List.of(10L)), quizIdsCaptor.capture(),
                eq(AttemptStatus.SUBMITTED));
        assertEquals(List.of(300L, 301L), quizIdsCaptor.getValue());
    }

    @Test
    @DisplayName("A brand-new batch with no classes and no quizzes returns null metrics")
    void brandNewBatch_noActivity_returnsNulls() {
        when(batchRepository.existsById(200L)).thenReturn(true);
        when(batchRepository.findById(200L)).thenReturn(java.util.Optional.of(currentBatch));
        when(enrollmentRepository.findActiveStudentsByBatchId(200L)).thenReturn(List.of(student));
        when(quizRepository.findIdsByBatchId(200L)).thenReturn(List.of());
        when(quizRepository.findCourseLevelIdsByCourseId(2L)).thenReturn(List.of());
        when(attendanceRepository.findByStudentIdInAndDailyClassBatchId(List.of(10L), 200L)).thenReturn(List.of());

        ReportStudentResponse row = rowFor(reportFor(200L));

        assertNull(row.attendancePct());
        assertNull(row.avgQuizScore());
        verify(quizAttemptRepository, never()).findByStudentIdInAndQuizIdInAndStatus(anyList(), anyCollection(),
                eq(AttemptStatus.SUBMITTED));
    }

    @Test
    @DisplayName("Valid current-batch activity drives attendance % and quiz score")
    void validCurrentBatchActivity_computedCorrectly() {
        Quiz quiz = makeQuiz(300L, 2L, 200L);
        QuizAttempt attempt1 = makeAttempt(1L, quiz, 10L, 70.0);
        QuizAttempt attempt2 = makeAttempt(2L, quiz, 10L, 90.0);

        DailyClass class1 = makeClass(210L, currentBatch);
        DailyClass class2 = makeClass(211L, currentBatch);
        List<Attendance> attendances = List.of(
                makeAttendance(1L, student, class1, AttendStatus.PRESENT),
                makeAttendance(2L, student, class2, AttendStatus.PRESENT),
                makeAttendance(3L, student, currentClass, AttendStatus.ABSENT));

        when(batchRepository.existsById(200L)).thenReturn(true);
        when(batchRepository.findById(200L)).thenReturn(java.util.Optional.of(currentBatch));
        when(enrollmentRepository.findActiveStudentsByBatchId(200L)).thenReturn(List.of(student));
        when(quizRepository.findIdsByBatchId(200L)).thenReturn(List.of(300L));
        when(quizRepository.findCourseLevelIdsByCourseId(2L)).thenReturn(List.of());
        when(quizAttemptRepository.findByStudentIdInAndQuizIdInAndStatus(eq(List.of(10L)), anyCollection(),
                eq(AttemptStatus.SUBMITTED))).thenReturn(List.of(attempt1, attempt2));
        when(attendanceRepository.findByStudentIdInAndDailyClassBatchId(List.of(10L), 200L)).thenReturn(attendances);

        ReportStudentResponse row = rowFor(reportFor(200L));

        assertEquals(66.7, row.attendancePct());
        assertEquals(80.0, row.avgQuizScore());
    }
}