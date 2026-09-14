package com.careerlabs.lms.api.enrollment;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.impl.EnrollmentServiceImpl;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves that concurrent enrollment requests cannot exceed the configured
 * batch capacity ({@code maxStudents}). Uses real H2 database with pessimistic
 * locking to serialize concurrent transactions on the same batch row.
 *
 * <p>Not {@code @Transactional} at class level: each {@code @Test} method runs
 * non-transactionally so that concurrent threads each open their own DB
 * transaction, exactly miricking real production behaviour. Data setup and
 * teardown use {@link TransactionTemplate} for explicit commit/rollback.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class EnrollmentCapacityConcurrencyTest {

    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private BatchRepository batchRepository;
    @Autowired private EnrollmentRepository enrollmentRepository;
    @Autowired private EnrollmentServiceImpl enrollmentService;
    @Autowired private TransactionTemplate txTemplate;

    private Course course;
    private Batch batch;

    @BeforeEach
    void setUp() {
        course = txTemplate.execute(status -> {
            Course c = new Course();
            c.setTitle("Concurrency Test Course " + System.nanoTime());
            c.setDescription("Test");
            c.setDuration("3 months");
            c.setStatus(CourseStatus.PUBLISHED);
            return courseRepository.save(c);
        });

        batch = txTemplate.execute(status -> {
            Batch b = new Batch();
            b.setName("Concurrency Batch " + System.nanoTime());
            b.setCourse(course);
            b.setStartDate(LocalDate.now());
            b.setEndDate(LocalDate.now().plusMonths(1));
            b.setMaxStudents(3);
            b.setActive(true);
            return batchRepository.save(b);
        });
    }

    @AfterEach
    void tearDown() {
        txTemplate.executeWithoutResult(status -> {
            enrollmentRepository.deleteAllByCourseId(course.getId());
            studentRepository.nullifyCourseForCourseId(course.getId());
            batchRepository.delete(batch);
            courseRepository.delete(course);
        });
    }

    private Student createStudent(String suffix) {
        return txTemplate.execute(status -> {
            User user = new User();
            user.setName("Student " + suffix);
            user.setEmail("student-" + suffix + "-" + System.nanoTime() + "@test.com");
            user.setPasswordHash("hash");
            user.setRole(Role.STUDENT);
            user.setActive(true);
            user = userRepository.save(user);

            Student student = new Student();
            student.setUser(user);
            student.setEnrollmentNo("CL-TEST-" + suffix + "-" + System.nanoTime());
            return studentRepository.save(student);
        });
    }

    @Test
    @DisplayName("Concurrent enrollments must not exceed batch maxStudents capacity")
    void concurrentEnrollments_mustNotExceedCapacity() throws Exception {
        int maxStudents = batch.getMaxStudents();
        int concurrentAttempts = 10;

        ExecutorService executor = Executors.newFixedThreadPool(concurrentAttempts);
        CountDownLatch readyLatch = new CountDownLatch(concurrentAttempts);
        CountDownLatch goLatch = new CountDownLatch(1);

        List<Long> studentIds = new ArrayList<>();
        for (int i = 0; i < concurrentAttempts; i++) {
            Student s = createStudent("conc-" + i);
            studentIds.add(s.getId());
        }

        List<Future<Void>> futures = new ArrayList<>();
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger capacityErrorCount = new AtomicInteger(0);

        for (int i = 0; i < concurrentAttempts; i++) {
            final Long studentId = studentIds.get(i);
            final Long courseId = course.getId();
            final Long batchId = batch.getId();

            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                goLatch.await(10, TimeUnit.SECONDS);

                try {
                    enrollmentService.enrollStudentByAdmin(courseId,
                            new EnrollStudentRequest(studentId, batchId));
                    successCount.incrementAndGet();
                } catch (BadRequestException e) {
                    assertTrue(e.getMessage().contains("full capacity"),
                            "Expected capacity error but got: " + e.getMessage());
                    capacityErrorCount.incrementAndGet();
                } catch (ConflictException e) {
                    capacityErrorCount.incrementAndGet();
                }
                return null;
            }));
        }

        readyLatch.await(10, TimeUnit.SECONDS);
        goLatch.countDown();

        for (Future<Void> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        executor.shutdown();

        long actualEnrolled = enrollmentRepository.countByBatchIdAndActiveTrue(batch.getId());

        assertTrue(actualEnrolled <= maxStudents,
                "Batch capacity exceeded! maxStudents=" + maxStudents
                        + " but enrolled=" + actualEnrolled
                        + " (success=" + successCount.get()
                        + ", capacityErrors=" + capacityErrorCount.get() + ")");

        assertTrue(successCount.get() <= maxStudents,
                "More successes than capacity allows: " + successCount.get());

        assertEquals(concurrentAttempts, successCount.get() + capacityErrorCount.get(),
                "All attempts should result in either success or capacity error");
    }

    @Test
    @DisplayName("Enrollment at exact capacity succeeds; next attempt is rejected")
    void atExactCapacity_nextEnrollmentRejected() {
        for (int i = 0; i < batch.getMaxStudents(); i++) {
            Student s = createStudent("fill-" + i);
            enrollmentService.enrollStudentByAdmin(course.getId(),
                    new EnrollStudentRequest(s.getId(), batch.getId()));
        }

        long countAfterFill = enrollmentRepository.countByBatchIdAndActiveTrue(batch.getId());
        assertEquals(batch.getMaxStudents(), countAfterFill, "Batch should be exactly at capacity");

        Student extraStudent = createStudent("overflow");

        BadRequestException ex = org.junit.jupiter.api.Assertions.assertThrows(
                BadRequestException.class,
                () -> enrollmentService.enrollStudentByAdmin(course.getId(),
                        new EnrollStudentRequest(extraStudent.getId(), batch.getId())));

        assertTrue(ex.getMessage().contains("full capacity"),
                "Expected capacity error, got: " + ex.getMessage());

        long countAfterAttempt = enrollmentRepository.countByBatchIdAndActiveTrue(batch.getId());
        assertEquals(batch.getMaxStudents(), countAfterAttempt,
                "Count must remain at maxStudents after rejected attempt");
    }

    @Test
    @DisplayName("Multiple concurrent requests at capacity: exactly maxStudents succeed, rest rejected")
    void concurrentRequestsAtCapacity_correctRejectionCount() throws Exception {
        for (int i = 0; i < batch.getMaxStudents(); i++) {
            Student s = createStudent("pre-" + i);
            enrollmentService.enrollStudentByAdmin(course.getId(),
                    new EnrollStudentRequest(s.getId(), batch.getId()));
        }

        int overflowAttempts = 5;
        ExecutorService executor = Executors.newFixedThreadPool(overflowAttempts);
        CountDownLatch readyLatch = new CountDownLatch(overflowAttempts);
        CountDownLatch goLatch = new CountDownLatch(1);

        List<Long> extraStudentIds = new ArrayList<>();
        for (int i = 0; i < overflowAttempts; i++) {
            Student s = createStudent("over-" + i);
            extraStudentIds.add(s.getId());
        }

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger capacityErrorCount = new AtomicInteger(0);
        List<Future<Void>> futures = new ArrayList<>();

        for (int i = 0; i < overflowAttempts; i++) {
            final Long studentId = extraStudentIds.get(i);
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                goLatch.await(10, TimeUnit.SECONDS);
                try {
                    enrollmentService.enrollStudentByAdmin(course.getId(),
                            new EnrollStudentRequest(studentId, batch.getId()));
                    successCount.incrementAndGet();
                } catch (BadRequestException e) {
                    capacityErrorCount.incrementAndGet();
                } catch (ConflictException e) {
                    capacityErrorCount.incrementAndGet();
                }
                return null;
            }));
        }

        readyLatch.await(10, TimeUnit.SECONDS);
        goLatch.countDown();

        for (Future<Void> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        executor.shutdown();

        long finalCount = enrollmentRepository.countByBatchIdAndActiveTrue(batch.getId());

        assertTrue(finalCount <= batch.getMaxStudents(),
                "Capacity violated! maxStudents=" + batch.getMaxStudents()
                        + " but enrolled=" + finalCount);

        assertEquals(overflowAttempts, successCount.get() + capacityErrorCount.get(),
                "All overflow attempts should result in success or capacity error");
    }
}
