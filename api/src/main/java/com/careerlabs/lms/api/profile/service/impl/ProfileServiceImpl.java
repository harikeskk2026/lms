package com.careerlabs.lms.api.profile.service.impl;

import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.InvalidCredentialsException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.profile.dto.request.ChangePasswordRequest;
import com.careerlabs.lms.api.profile.dto.request.UpdateProfileRequest;
import com.careerlabs.lms.api.profile.dto.response.PhotoUploadResponse;
import com.careerlabs.lms.api.profile.dto.response.ProfileResponse;
import com.careerlabs.lms.api.profile.service.ProfileService;
import com.careerlabs.lms.api.security.TokenRevocationService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Backs the "My Profile" module for every role. STUDENT accounts compose their
 * section from {@link Student} + {@link AcademicDetails} (never a duplicate copy);
 * every other role (SUPERADMIN/ADMIN/TRAINER - functionally identical today, see
 * docs/LMS_MODULE_WORKFLOWS.md §1) composes its section from the new profile
 * columns on {@link User} directly, since no companion entity exists for them.
 * Role and account-active status are always read-only here - callers can only
 * ever act on their own account (userId comes from the JWT principal, never a
 * path/body parameter), and can never change their own role or activation state.
 */
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import java.util.stream.Collectors;

@Service
public class ProfileServiceImpl implements ProfileService {

    private static final Set<String> ALLOWED_PHOTO_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AcademicDetailsRepository academicDetailsRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final TokenRevocationService tokenRevocationService;

    public ProfileServiceImpl(UserRepository userRepository, StudentRepository studentRepository,
                               EnrollmentRepository enrollmentRepository,
                               AcademicDetailsRepository academicDetailsRepository,
                               FileStorageService fileStorageService, PasswordEncoder passwordEncoder,
                               TokenRevocationService tokenRevocationService) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.academicDetailsRepository = academicDetailsRepository;
        this.fileStorageService = fileStorageService;
        this.passwordEncoder = passwordEncoder;
        this.tokenRevocationService = tokenRevocationService;
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileResponse get(Long userId) {
        return toResponse(findUserOrThrow(userId));
    }

    @Override
    @Transactional
    public ProfileResponse update(Long userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);
        user.setName(request.getName());

        if (user.getRole() == Role.STUDENT) {
            Student student = studentRepository.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));
            student.setPhone(request.getPhone());
            student.setAddress(request.getAddress());
            student.setQualification(request.getQualification());
            student.setLinkedinUrl(request.getLinkedinUrl());
            student.setGithubUrl(request.getGithubUrl());
            studentRepository.save(student);
        } else {
            user.setPhone(request.getPhone());
            user.setDesignation(request.getDesignation());
            user.setDepartment(request.getDepartment());
        }

        userRepository.save(user);
        return toResponse(user);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUserOrThrow(userId);
        if (user.getRole() != Role.SUPERADMIN) {
            throw new ForbiddenException("Only SUPERADMIN is permitted to change their own password.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        tokenRevocationService.revokeAllUserTokens(userId);
    }

    @Override
    @Transactional
    public PhotoUploadResponse uploadPhoto(Long userId, MultipartFile file) {
        User user = findUserOrThrow(userId);
        StoredFile stored = fileStorageService.store(file, "profile-photos", ALLOWED_PHOTO_EXTENSIONS);
        user.setPhotoUrl(stored.url());
        userRepository.save(user);
        return new PhotoUploadResponse(stored.url());
    }

    private ProfileResponse toResponse(User user) {
        if (user.getRole() == Role.STUDENT) {
            Student student = studentRepository.findByUserId(user.getId()).orElse(null);
            return new ProfileResponse(
                    user.getId(), user.getName(), user.getEmail(), user.getRole(), user.isActive(),
                    user.getLastLoginAt(), user.getCreatedAt(),
                    student != null ? student.getPhone() : null,
                    user.getPhotoUrl(),
                    student != null ? studentSection(student) : null,
                    null);
        }
        return new ProfileResponse(
                user.getId(), user.getName(), user.getEmail(), user.getRole(), user.isActive(),
                user.getLastLoginAt(), user.getCreatedAt(),
                user.getPhone(), user.getPhotoUrl(),
                null,
                new ProfileResponse.AdminSection(user.getDesignation(), user.getDepartment()));
    }

    private ProfileResponse.StudentSection studentSection(Student student) {
        AcademicDetails academic = academicDetailsRepository.findByStudentId(student.getId()).orElse(null);
        List<String> missing = missingAcademicFields(academic);

        List<Batch> activeBatches = enrollmentRepository.findActiveBatchesByStudentId(student.getId());
        String batchNames = activeBatches.stream().map(Batch::getName).collect(Collectors.joining(", "));

        return new ProfileResponse.StudentSection(
                student.getEnrollmentNo(),
                student.getAddress(),
                student.getQualification(),
                student.getLinkedinUrl(),
                student.getGithubUrl(),
                student.getCollege() != null ? student.getCollege().getName() : null,
                student.getCourse() != null ? student.getCourse().getTitle() : null,
                batchNames.isEmpty() ? null : batchNames,
                missing.isEmpty(),
                missing);
    }

    /**
     * The fields Placement eligibility actually reads (see PlacementEligibilityGuard):
     * 10th/12th percentage, and the UG degree/score-type/score used for CGPA or
     * percentage criteria. Diploma and PG remain optional education stages, same as
     * the existing admin-side academic details form.
     */
    private List<String> missingAcademicFields(AcademicDetails academic) {
        List<String> missing = new ArrayList<>();
        if (academic == null) {
            missing.add("10th percentage");
            missing.add("12th percentage");
            missing.add("UG degree and score");
            return missing;
        }
        if (academic.getTenthPercentage() == null) {
            missing.add("10th percentage");
        }
        if (academic.getTwelfthPercentage() == null) {
            missing.add("12th percentage");
        }
        if (academic.getUgDegree() == null || academic.getUgDegree().isBlank()
                || academic.getUgScoreType() == null || academic.getUgScore() == null) {
            missing.add("UG degree and score");
        }
        return missing;
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
