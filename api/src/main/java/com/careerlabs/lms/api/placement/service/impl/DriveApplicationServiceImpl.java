package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveApplicationResponse;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationResponse;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationStatusHistoryResponse;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatusHistory;
import com.careerlabs.lms.api.placement.entity.DriveStatus;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationStatusHistoryRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.service.DriveApplicationService;
import com.careerlabs.lms.api.placement.service.PlacementEligibilityGuard;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Owns the student-initiated "express interest" action and the admin-mediated
 * review pipeline that follows it. See {@link DriveApplicationStatus} for the
 * full status vocabulary and legal transition graph enforced here.
 */
@Service
public class DriveApplicationServiceImpl implements DriveApplicationService {

    /** Mirrors the transition graph documented on {@link DriveApplicationStatus}. */
    private static final Map<DriveApplicationStatus, Set<DriveApplicationStatus>> ALLOWED_TRANSITIONS = new EnumMap<>(DriveApplicationStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.INTERESTED, Set.of(DriveApplicationStatus.UNDER_REVIEW));
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.UNDER_REVIEW,
                Set.of(DriveApplicationStatus.SHORTLISTED, DriveApplicationStatus.REJECTED));
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.SHORTLISTED,
                Set.of(DriveApplicationStatus.RESUME_SHARED, DriveApplicationStatus.REJECTED));
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.RESUME_SHARED,
                Set.of(DriveApplicationStatus.SELECTED, DriveApplicationStatus.NOT_SELECTED));
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.SELECTED, Set.of());
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.NOT_SELECTED, Set.of());
        ALLOWED_TRANSITIONS.put(DriveApplicationStatus.REJECTED, Set.of());
    }

    private final DriveRepository driveRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final DriveApplicationStatusHistoryRepository statusHistoryRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final PlacementEligibilityGuard eligibilityGuard;
    private final NotificationService notificationService;

    public DriveApplicationServiceImpl(DriveRepository driveRepository,
                                        DriveApplicationRepository driveApplicationRepository,
                                        DriveApplicationStatusHistoryRepository statusHistoryRepository,
                                        StudentRepository studentRepository,
                                        UserRepository userRepository,
                                        PlacementEligibilityGuard eligibilityGuard,
                                        NotificationService notificationService) {
        this.driveRepository = driveRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.eligibilityGuard = eligibilityGuard;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public DriveApplicationResponse expressInterest(Long driveId, Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));

        Drive drive = driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Drive not found: " + driveId));

        if (drive.getStatus() == DriveStatus.CLOSED || drive.getStatus() == DriveStatus.CANCELLED) {
            throw new ForbiddenException("This opportunity is no longer accepting applications");
        }

        if (drive.getApplyDeadline() != null && LocalDate.now().isAfter(drive.getApplyDeadline())) {
            throw new ForbiddenException("The application deadline for this opportunity has passed");
        }

        if (!eligibilityGuard.isEligible(student, drive)) {
            throw new ForbiddenException("You do not meet the eligibility criteria for this opportunity");
        }

        if (driveApplicationRepository.existsByDrive_IdAndStudent_Id(driveId, student.getId())) {
            throw new ConflictException("You have already expressed interest in this opportunity");
        }

        DriveApplication application = new DriveApplication();
        application.setDrive(drive);
        application.setStudent(student);
        application = driveApplicationRepository.save(application);

        recordHistory(application, null, DriveApplicationStatus.INTERESTED, null, student.getUser());

        notificationService.notifyAdmins(
                "📩 New Application: " + drive.getCompanyName(),
                student.getUser().getName() + " expressed interest in " + drive.getCompanyName()
                        + " (" + drive.getRole() + ").",
                NotificationType.DRIVE,
                "/admin/placement");

        return DriveApplicationResponse.from(application);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminDriveApplicationResponse> listForDrive(Long driveId) {
        return driveApplicationRepository.findAllByDrive_IdOrderByCreatedAtDesc(driveId).stream()
                .map(AdminDriveApplicationResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public AdminDriveApplicationResponse updateStatus(Long driveId, Long applicationId, DriveApplicationStatus newStatus,
                                                        String note, Long adminUserId) {
        DriveApplication application = driveApplicationRepository.findByIdAndDrive_Id(applicationId, driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        DriveApplicationStatus currentStatus = application.getStatus();
        if (!ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of()).contains(newStatus)) {
            throw new BadRequestException("Cannot move an application from " + currentStatus + " to " + newStatus);
        }

        application.setStatus(newStatus);
        if (note != null && !note.isBlank()) {
            application.setNotes(note);
        }
        application = driveApplicationRepository.save(application);

        User admin = requireUser(adminUserId);
        recordHistory(application, currentStatus, newStatus, note, admin);
        notifyStudentOfTransition(application, newStatus, note);

        return AdminDriveApplicationResponse.from(application);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DriveApplicationStatusHistoryResponse> getStatusHistory(Long driveId, Long applicationId) {
        driveApplicationRepository.findByIdAndDrive_Id(applicationId, driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        return statusHistoryRepository.findByApplication_IdOrderByChangedAtDesc(applicationId).stream()
                .map(DriveApplicationStatusHistoryResponse::from)
                .toList();
    }

    private void recordHistory(DriveApplication application, DriveApplicationStatus fromStatus,
                                DriveApplicationStatus toStatus, String note, User changedBy) {
        DriveApplicationStatusHistory history = new DriveApplicationStatusHistory();
        history.setApplication(application);
        history.setFromStatus(fromStatus);
        history.setToStatus(toStatus);
        history.setNote(note);
        history.setChangedBy(changedBy);
        statusHistoryRepository.save(history);
    }

    private void notifyStudentOfTransition(DriveApplication application, DriveApplicationStatus newStatus, String note) {
        Long studentUserId = application.getStudent().getUser().getId();
        String company = application.getDrive().getCompanyName();
        String role = application.getDrive().getRole();
        String reasonSuffix = note != null && !note.isBlank() ? " " + note : "";

        switch (newStatus) {
            case UNDER_REVIEW -> notificationService.notifyUser(studentUserId,
                    "Application Under Review",
                    "Your application to " + company + " (" + role + ") is now under review.",
                    NotificationType.STATUS, "/student/placement");
            case SHORTLISTED -> notificationService.notifyUser(studentUserId,
                    "🎉 Shortlisted!",
                    "You've been shortlisted for " + company + " (" + role + ").",
                    NotificationType.SUCCESS, "/student/placement");
            case RESUME_SHARED -> notificationService.notifyUser(studentUserId,
                    "Resume Shared",
                    "Your resume has been shared with " + company + " for the " + role + " role.",
                    NotificationType.RESUME, "/student/placement");
            case SELECTED -> notificationService.notifyUser(studentUserId,
                    "🎉 You've Been Selected!",
                    "Congratulations! You've been selected for " + company + " (" + role + ").",
                    NotificationType.SUCCESS, "/student/placement");
            case NOT_SELECTED -> notificationService.notifyUser(studentUserId,
                    "Application Update",
                    "You were not selected for " + company + " (" + role + ")." + reasonSuffix,
                    NotificationType.WARNING, "/student/placement");
            case REJECTED -> notificationService.notifyUser(studentUserId,
                    "Application Rejected",
                    "Your application to " + company + " was rejected." + reasonSuffix,
                    NotificationType.WARNING, "/student/placement");
            default -> {
                // INTERESTED is only ever reached via expressInterest, never via updateStatus.
            }
        }
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }
}
