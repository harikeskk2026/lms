package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.placement.dto.request.CreateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveRequest;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveResponse;
import com.careerlabs.lms.api.placement.dto.response.StudentDriveResponse;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationStatusHistoryRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.service.DriveService;
import com.careerlabs.lms.api.placement.service.PlacementEligibilityGuard;
import com.careerlabs.lms.api.placement.validation.DriveValidationMessages;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DriveServiceImpl implements DriveService {

    private final DriveRepository driveRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final DriveApplicationStatusHistoryRepository statusHistoryRepository;
    private final StudentRepository studentRepository;
    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final PlacementEligibilityGuard eligibilityGuard;

    public DriveServiceImpl(DriveRepository driveRepository, DriveApplicationRepository driveApplicationRepository,
                             DriveApplicationStatusHistoryRepository statusHistoryRepository,
                             StudentRepository studentRepository, BatchRepository batchRepository,
                             CourseRepository courseRepository,
                             PlacementEligibilityGuard eligibilityGuard) {
        this.driveRepository = driveRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.studentRepository = studentRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.eligibilityGuard = eligibilityGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminDriveResponse> listForAdmin() {
        List<Drive> drives = driveRepository.findAllByOrderByDriveDateAsc();
        Map<Long, Long> counts = applicationCountsByDrive(drives.stream().map(Drive::getId).toList());
        return drives.stream()
                .map(drive -> AdminDriveResponse.from(drive, counts.getOrDefault(drive.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDriveResponse get(Long id) {
        Drive drive = findOrThrow(id);
        return AdminDriveResponse.from(drive, driveApplicationRepository.countByDrive_Id(id));
    }

    @Override
    @Transactional
    public AdminDriveResponse create(CreateDriveRequest request, Long adminUserId) {
        validateDriveDates(request.getDriveDate(), request.getApplyDeadline(), true);
        Drive drive = new Drive();
        applyCreate(drive, request);
        drive.setCreatedBy(adminUserId);
        return AdminDriveResponse.from(driveRepository.save(drive), 0L);
    }

    @Override
    @Transactional
    public AdminDriveResponse update(Long id, UpdateDriveRequest request) {
        validateDriveDates(request.getDriveDate(), request.getApplyDeadline(), false);
        Drive drive = findOrThrow(id);
        applyUpdate(drive, request);
        long applicationCount = driveApplicationRepository.countByDrive_Id(id);
        return AdminDriveResponse.from(driveRepository.save(drive), applicationCount);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Drive drive = findOrThrow(id);
        statusHistoryRepository.deleteAllByApplication_Drive_Id(id);
        driveApplicationRepository.deleteAllByDrive_Id(id);
        driveRepository.delete(drive);
    }

    private Map<Long, Long> applicationCountsByDrive(List<Long> driveIds) {
        if (driveIds.isEmpty()) {
            return Map.of();
        }
        return driveApplicationRepository.countGroupedByDriveId(driveIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentDriveResponse> listForStudent(Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));

        Map<Long, DriveApplication> applicationsByDriveId = driveApplicationRepository
                .findAllByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .collect(Collectors.toMap(a -> a.getDrive().getId(), Function.identity(), (a, b) -> a));

        return driveRepository.findAllByOrderByDriveDateAsc().stream()
                .map(drive -> StudentDriveResponse.from(
                        drive,
                        eligibilityGuard.isEligible(student, drive),
                        eligibilityGuard.ineligibilityReasons(student, drive),
                        eligibilityGuard.hasIncompleteAcademicData(student, drive),
                        applicationsByDriveId.containsKey(drive.getId())
                                ? applicationsByDriveId.get(drive.getId()).getStatus()
                                : null))
                .toList();
    }

    /**
     * Apply deadline must be on or before the drive date - it is intentionally NOT
     * compared to today independently of the drive date, so an existing drive whose
     * date has since arrived (or an admin editing history) can still carry a deadline
     * that is now in the past, as long as it never came after its own drive date.
     */
    private void validateDriveDates(LocalDate driveDate, LocalDate applyDeadline, boolean creating) {
        if (driveDate == null && applyDeadline == null) {
            return;
        }
        if (driveDate != null && applyDeadline != null && applyDeadline.isAfter(driveDate)) {
            throw new BadRequestException(DriveValidationMessages.APPLY_DEADLINE_AFTER_DRIVE_DATE);
        }
        if (creating && driveDate != null && driveDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Drive date cannot be in the past");
        }
    }

    /**
     * Defense-in-depth: a client could otherwise submit eligibleBatchIds that don't
     * belong to any of the submitted eligibleCourseIds. Skipped when no course is
     * selected (batch-only restriction, independent of course, remains supported) or
     * when no specific batch is selected (empty batches = "all batches under the
     * selected course(s)", unchanged - see PlacementEligibilityGuard).
     */
    private void validateEligibleBatchesBelongToCourses(List<Long> eligibleCourseIds, Set<Batch> eligibleBatches) {
        if (eligibleCourseIds == null || eligibleCourseIds.isEmpty() || eligibleBatches.isEmpty()) {
            return;
        }
        Set<Long> courseIdSet = new LinkedHashSet<>(eligibleCourseIds);
        for (Batch batch : eligibleBatches) {
            Long batchCourseId = batch.getCourse() != null ? batch.getCourse().getId() : null;
            if (batchCourseId == null || !courseIdSet.contains(batchCourseId)) {
                throw new BadRequestException(DriveValidationMessages.ELIGIBLE_BATCH_COURSE_MISMATCH
                        + ": '" + batch.getName() + "'");
            }
        }
    }

    private void applyCreate(Drive drive, CreateDriveRequest request) {
        drive.setCompanyName(request.getCompanyName());
        drive.setRole(request.getRole());
        drive.setPackageOffered(request.getPackageOffered());
        drive.setLocation(request.getLocation());
        drive.setDriveDate(request.getDriveDate());
        drive.setApplyDeadline(request.getApplyDeadline());
        drive.setDescription(request.getDescription());
        drive.setRequirements(request.getRequirements());
        drive.setSkills(request.getSkills());
        drive.setDriveType(request.getDriveType());
        drive.setApplyLink(request.getApplyLink());
        drive.setMinCgpa(request.getMinCgpa());
        drive.setMinPercentage(request.getMinPercentage());
        drive.setMaxBacklogs(request.getMaxBacklogs());
        drive.setMinAttendancePct(request.getMinAttendancePct());
        Set<Batch> batches = resolveBatches(request.getEligibleBatchIds());
        validateEligibleBatchesBelongToCourses(request.getEligibleCourseIds(), batches);
        drive.setEligibleBatches(batches);
        drive.setEligibleCourses(resolveCourses(request.getEligibleCourseIds()));
    }

    private void applyUpdate(Drive drive, UpdateDriveRequest request) {
        drive.setCompanyName(request.getCompanyName());
        drive.setRole(request.getRole());
        drive.setPackageOffered(request.getPackageOffered());
        drive.setLocation(request.getLocation());
        drive.setDriveDate(request.getDriveDate());
        drive.setApplyDeadline(request.getApplyDeadline());
        drive.setDescription(request.getDescription());
        drive.setRequirements(request.getRequirements());
        drive.setSkills(request.getSkills());
        drive.setDriveType(request.getDriveType());
        drive.setApplyLink(request.getApplyLink());
        drive.setMinCgpa(request.getMinCgpa());
        drive.setMinPercentage(request.getMinPercentage());
        drive.setMaxBacklogs(request.getMaxBacklogs());
        drive.setMinAttendancePct(request.getMinAttendancePct());
        Set<Batch> batches = resolveBatches(request.getEligibleBatchIds());
        validateEligibleBatchesBelongToCourses(request.getEligibleCourseIds(), batches);
        drive.setEligibleBatches(batches);
        drive.setEligibleCourses(resolveCourses(request.getEligibleCourseIds()));
    }

    private Set<Batch> resolveBatches(List<Long> ids) {
        return ids == null || ids.isEmpty() ? new LinkedHashSet<>() : new LinkedHashSet<>(batchRepository.findAllById(ids));
    }

    private Set<Course> resolveCourses(List<Long> ids) {
        return ids == null || ids.isEmpty() ? new LinkedHashSet<>() : new LinkedHashSet<>(courseRepository.findAllById(ids));
    }

    private Drive findOrThrow(Long id) {
        return driveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Drive not found: " + id));
    }
}
