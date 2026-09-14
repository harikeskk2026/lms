package com.careerlabs.lms.api.enrollment;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.enrollment.service.impl.EnrollmentServiceImpl;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnrollmentScheduleConflictTest {

    @Mock EnrollmentRepository enrollmentRepository;
    @Mock StudentRepository studentRepository;
    @Mock CourseRepository courseRepository;
    @Mock BatchRepository batchRepository;

    BatchScheduleConflictValidator validator;
    CourseAccessGuard accessGuard;
    EnrollmentServiceImpl enrollmentService;

    Course course1, course2;
    Batch existingBatch, newBatchConflict, newBatchNoTimeConflict, newBatchNoDateConflict;
    Student student;
    User studentUser;

    void setId(Object o, Long id){ ReflectionTestUtils.setField(o,"id",id); }

    Batch makeBatch(Long id, String name, Course course, LocalDate start, LocalDate end, String timing, boolean active){
        Batch b = new Batch();
        setId(b, id);
        b.setName(name);
        b.setCourse(course);
        b.setStartDate(start);
        b.setEndDate(end);
        b.setTiming(timing);
        b.setActive(active);
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
        accessGuard = new CourseAccessGuard(studentRepository, enrollmentRepository, batchRepository, courseRepository);
        enrollmentService = new EnrollmentServiceImpl(enrollmentRepository, studentRepository, courseRepository, batchRepository, validator, accessGuard);

        course1 = makeCourse(10L, "Java Bootcamp");
        course2 = makeCourse(20L, "Python Bootcamp");
        course2.setTitle("Python Bootcamp");

        existingBatch = makeBatch(100L, "Batch A", course1, LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", true);
        newBatchConflict = makeBatch(200L, "Batch B", course2, LocalDate.of(2026,9,15), LocalDate.of(2026,10,15), "10:00 AM - 01:00 PM", true);
        newBatchNoTimeConflict = makeBatch(201L, "Batch C", course2, LocalDate.of(2026,9,15), LocalDate.of(2026,10,15), "02:00 PM - 05:00 PM", true);
        newBatchNoDateConflict = makeBatch(202L, "Batch D", course2, LocalDate.of(2026,10,1), LocalDate.of(2026,10,31), "09:00 AM - 12:00 PM", true);

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
    @DisplayName("Same dates + same timing -> Reject (ConflictException)")
    void sameDatesSameTiming_reject() {
        Batch dupBatch = makeBatch(200L, "Batch B", course2, LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", true);
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(dupBatch));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        ConflictException ex = assertThrows(ConflictException.class, () -> enrollmentService.enrollStudentByAdmin(20L, req));
        assertTrue(ex.getMessage().contains("schedule overlaps"));
    }

    @Test
    @DisplayName("Overlapping dates + overlapping timing -> Reject")
    void overlappingDatesOverlappingTiming_reject() {
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(newBatchConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        assertThrows(ConflictException.class, () -> enrollmentService.enrollStudentByAdmin(20L, req));
    }

    @Test
    @DisplayName("Overlapping dates + different non-overlapping timing -> Allow")
    void overlappingDatesDifferentTiming_allow() {
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(201L)).thenReturn(Optional.of(newBatchNoTimeConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(201L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 201L);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
        verify(enrollmentRepository).save(any(Enrollment.class));
    }

    @Test
    @DisplayName("Same timing + non-overlapping dates -> Allow")
    void sameTimingNonOverlappingDates_allow() {
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(202L)).thenReturn(Optional.of(newBatchNoDateConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(202L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 202L);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
    }

    @Test
    @DisplayName("Different courses + conflicting schedules -> Reject")
    void differentCoursesConflicting_reject() {
        // same as overlapping test but courses are different (course1 vs course2)
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(newBatchConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        ConflictException ex = assertThrows(ConflictException.class, () -> enrollmentService.enrollStudentByAdmin(20L, req));
        assertTrue(ex.getMessage().contains("Batch A"));
    }

    @Test
    @DisplayName("Different courses + non-conflicting schedules -> Allow")
    void differentCoursesNonConflicting_allow() {
        Enrollment existing = makeEnrollment(1L, student, course1, existingBatch, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(201L)).thenReturn(Optional.of(newBatchNoTimeConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(201L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existing));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 201L);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
    }

    @Test
    @DisplayName("Existing inactive batch -> Allow")
    void inactiveExistingBatch_allow() {
        Batch inactiveBatch = makeBatch(100L, "Batch A", course1, LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", false);
        Enrollment existingInactive = makeEnrollment(1L, student, course1, inactiveBatch, true);
        // enrollment batch inactive should be skipped, also enrollment.active true but batch inactive
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(newBatchConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existingInactive));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
    }

    @Test
    @DisplayName("Existing enrollment with null batch -> Allow (no schedule to conflict)")
    void nullBatchInExisting_allow() {
        Enrollment existingNoBatch = makeEnrollment(1L, student, course1, null, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(newBatchConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of(existingNoBatch));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
    }

    @Test
    @DisplayName("Same course duplicate enrollment remains Conflict with original message")
    void sameCourseDuplicate_rejectOriginalMessage() {
        Enrollment existingSameCourse = makeEnrollment(1L, student, course2, null, true);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(newBatchConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.of(existingSameCourse));
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        // duplicate active should be thrown before schedule check

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        ConflictException ex = assertThrows(ConflictException.class, () -> enrollmentService.enrollStudentByAdmin(20L, req));
        assertTrue(ex.getMessage().contains("already actively enrolled"));
    }

    @Test
    @DisplayName("Enrolling without batch should not trigger schedule check even with overlapping dates")
    void enrollWithoutBatch_allow() {
        // batch is null in request - no schedule validation invoked
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, null);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
    }

    @Test
    @DisplayName("Inactive enrollment (isActive=false) should not block even if batch overlaps")
    void inactiveEnrollmentNotConsidered_allow() {
        Enrollment inactiveEnrollment = makeEnrollment(1L, student, course1, existingBatch, false);
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(course2));
        when(batchRepository.findByIdWithLock(200L)).thenReturn(Optional.of(newBatchConflict));
        when(enrollmentRepository.findByStudentIdAndCourseId(1L, 20L)).thenReturn(Optional.empty());
        when(enrollmentRepository.countByBatchIdAndActiveTrue(200L)).thenReturn(0L);
        // validator calls findAllByStudentIdAndActiveTrue -> will return empty (since inactive not included)
        when(enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(1L)).thenReturn(List.of());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(i -> i.getArgument(0));

        EnrollStudentRequest req = new EnrollStudentRequest(1L, 200L);
        assertDoesNotThrow(() -> enrollmentService.enrollStudentByAdmin(20L, req));
    }
}
