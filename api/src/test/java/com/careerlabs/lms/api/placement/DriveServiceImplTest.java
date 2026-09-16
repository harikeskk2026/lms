package com.careerlabs.lms.api.placement;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.placement.dto.request.CreateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveRequest;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveType;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.service.PlacementEligibilityGuard;
import com.careerlabs.lms.api.placement.service.impl.DriveServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Regression coverage for the Placement Drive audit fixes:
 * (#1) Application End Date must be on or before the Drive Date, with no
 *      unconditional "cannot be in the past" restriction, and
 * (#6) an eligible batch must belong to one of the eligible courses when both
 *      are submitted, enforced server-side regardless of frontend filtering.
 */
public class DriveServiceImplTest {

    private DriveRepository driveRepository;
    private DriveApplicationRepository driveApplicationRepository;
    private BatchRepository batchRepository;
    private CourseRepository courseRepository;
    private DriveServiceImpl service;

    @BeforeEach
    void setUp() {
        driveRepository = Mockito.mock(DriveRepository.class);
        driveApplicationRepository = Mockito.mock(DriveApplicationRepository.class);
        batchRepository = Mockito.mock(BatchRepository.class);
        courseRepository = Mockito.mock(CourseRepository.class);
        when(driveRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(driveApplicationRepository.countByDrive_Id(anyLong())).thenReturn(0L);
        service = new DriveServiceImpl(driveRepository, driveApplicationRepository, null, null,
                batchRepository, courseRepository, new PlacementEligibilityGuard(null, null));
    }

    private CreateDriveRequest createRequest(LocalDate driveDate, LocalDate applyDeadline) {
        CreateDriveRequest req = new CreateDriveRequest();
        req.setCompanyName("Tech Corp");
        req.setRole("Engineer");
        req.setDescription("Drive description");
        req.setDriveType(DriveType.CAMPUS);
        req.setDriveDate(driveDate);
        req.setApplyDeadline(applyDeadline);
        return req;
    }

    private UpdateDriveRequest updateRequest(LocalDate driveDate, LocalDate applyDeadline) {
        UpdateDriveRequest req = new UpdateDriveRequest();
        req.setCompanyName("Tech Corp");
        req.setRole("Engineer");
        req.setDescription("Drive description");
        req.setDriveType(DriveType.CAMPUS);
        req.setDriveDate(driveDate);
        req.setApplyDeadline(applyDeadline);
        return req;
    }

    private Course course(long id) {
        Course c = new Course();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    private Batch batch(long id, Course course) {
        Batch b = new Batch();
        ReflectionTestUtils.setField(b, "id", id);
        ReflectionTestUtils.setField(b, "name", "Batch " + id);
        ReflectionTestUtils.setField(b, "course", course);
        return b;
    }

    @Nested
    @DisplayName("#1 Application End Date: on or before the Drive Date, no unconditional past-date check")
    class ApplyDeadlineValidation {

        @Test
        @DisplayName("Deadline before drive date is valid (create)")
        void deadlineBeforeDriveDate_isValid() {
            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Deadline equal to drive date is valid - on-or-before, not strictly-before (create)")
        void deadlineEqualToDriveDate_isValid() {
            LocalDate driveDate = LocalDate.now().plusDays(5);
            CreateDriveRequest req = createRequest(driveDate, driveDate);
            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Deadline after drive date is rejected (create)")
        void deadlineAfterDriveDate_isRejected() {
            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(5), LocalDate.now().plusDays(6));
            assertThrows(BadRequestException.class, () -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Drive date = today, deadline = today is valid")
        void driveDateTodayDeadlineToday_isValid() {
            LocalDate today = LocalDate.now();
            CreateDriveRequest req = createRequest(today, today);
            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Drive date = today, deadline = yesterday is valid - no unconditional past-date rejection")
        void driveDateTodayDeadlineYesterday_isValid() {
            CreateDriveRequest req = createRequest(LocalDate.now(), LocalDate.now().minusDays(1));
            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Drive date in the future, deadline = today is valid")
        void futureDriveDateTodayDeadline_isValid() {
            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(30), LocalDate.now());
            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Deadline after drive date is rejected on update too")
        void deadlineAfterDriveDate_isRejectedOnUpdate() {
            when(driveRepository.findById(1L)).thenReturn(Optional.of(new Drive()));
            UpdateDriveRequest req = updateRequest(LocalDate.now().plusDays(5), LocalDate.now().plusDays(6));
            assertThrows(BadRequestException.class, () -> service.update(1L, req));
        }

        @Test
        @DisplayName("Past deadline on-or-before a past drive date is valid on update (editing historical drives)")
        void pastDeadlineWithPastDriveDate_isValidOnUpdate() {
            when(driveRepository.findById(1L)).thenReturn(Optional.of(new Drive()));
            UpdateDriveRequest req = updateRequest(LocalDate.now().minusDays(10), LocalDate.now().minusDays(12));
            assertDoesNotThrow(() -> service.update(1L, req));
        }
    }

    @Nested
    @DisplayName("#6 Eligible batches must belong to the eligible courses submitted")
    class BatchCourseCrossValidation {

        @Test
        @DisplayName("Valid course + matching batch is accepted")
        void validCourseAndMatchingBatch_isAccepted() {
            Course courseA = course(1L);
            Batch batchA = batch(10L, courseA);
            when(courseRepository.findAllById(List.of(1L))).thenReturn(List.of(courseA));
            when(batchRepository.findAllById(List.of(10L))).thenReturn(List.of(batchA));

            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleCourseIds(List.of(1L));
            req.setEligibleBatchIds(List.of(10L));

            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Multiple courses + batches belonging to those courses is accepted")
        void multipleCoursesAndBatches_isAccepted() {
            Course courseA = course(1L);
            Course courseB = course(2L);
            Batch batchA = batch(10L, courseA);
            Batch batchB = batch(20L, courseB);
            when(courseRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(courseA, courseB));
            when(batchRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(batchA, batchB));

            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleCourseIds(List.of(1L, 2L));
            req.setEligibleBatchIds(List.of(10L, 20L));

            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Batch belonging to an unselected course is rejected - cannot be bypassed via direct API call")
        void unrelatedBatch_isRejected() {
            Course selectedCourse = course(1L);
            Course otherCourse = course(99L);
            Batch unrelatedBatch = batch(50L, otherCourse);
            when(courseRepository.findAllById(List.of(1L))).thenReturn(List.of(selectedCourse));
            when(batchRepository.findAllById(List.of(50L))).thenReturn(List.of(unrelatedBatch));

            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleCourseIds(List.of(1L));
            req.setEligibleBatchIds(List.of(50L));

            assertThrows(BadRequestException.class, () -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Stale batch left over after the course selection changes is rejected on update")
        void staleBatchAfterCourseChange_isRejectedOnUpdate() {
            when(driveRepository.findById(1L)).thenReturn(Optional.of(new Drive()));

            Course oldCourse = course(1L);
            Course newCourse = course(2L);
            Batch oldBatch = batch(10L, oldCourse); // still belongs to the OLD course only
            when(courseRepository.findAllById(List.of(2L))).thenReturn(List.of(newCourse));
            when(batchRepository.findAllById(List.of(10L))).thenReturn(List.of(oldBatch));

            UpdateDriveRequest req = updateRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleCourseIds(List.of(2L)); // course changed to newCourse
            req.setEligibleBatchIds(List.of(10L)); // batch never updated - now stale

            assertThrows(BadRequestException.class, () -> service.update(1L, req));
        }

        @Test
        @DisplayName("Course selected with no specific batches is valid - means all batches under that course")
        void courseWithoutSpecificBatches_isValid() {
            Course courseA = course(1L);
            when(courseRepository.findAllById(List.of(1L))).thenReturn(List.of(courseA));

            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleCourseIds(List.of(1L));
            req.setEligibleBatchIds(List.of());

            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Batch-only restriction with no course selected remains supported (unchanged existing behavior)")
        void batchOnlyRestriction_remainsSupportedWithoutCourse() {
            Course someCourse = course(1L);
            Batch batchA = batch(10L, someCourse);
            when(batchRepository.findAllById(List.of(10L))).thenReturn(List.of(batchA));

            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleBatchIds(List.of(10L));

            assertDoesNotThrow(() -> service.create(req, 1L));
        }

        @Test
        @DisplayName("Multiple courses + batch belonging to only one of them is accepted")
        void batchBelongingToOneOfSeveralCourses_isAccepted() {
            Course courseA = course(1L);
            Course courseB = course(2L);
            Batch batchA = batch(10L, courseA);
            when(courseRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(courseA, courseB));
            when(batchRepository.findAllById(List.of(10L))).thenReturn(List.of(batchA));

            CreateDriveRequest req = createRequest(LocalDate.now().plusDays(10), LocalDate.now().plusDays(5));
            req.setEligibleCourseIds(List.of(1L, 2L));
            req.setEligibleBatchIds(List.of(10L));

            assertDoesNotThrow(() -> service.create(req, 1L));
        }
    }
}
