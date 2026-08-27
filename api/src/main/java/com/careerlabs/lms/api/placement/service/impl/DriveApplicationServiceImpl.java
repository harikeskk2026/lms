package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationResponse;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.service.DriveApplicationService;
import com.careerlabs.lms.api.placement.service.PlacementEligibilityGuard;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DriveApplicationServiceImpl implements DriveApplicationService {

    private final DriveRepository driveRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final StudentRepository studentRepository;
    private final PlacementEligibilityGuard eligibilityGuard;

    public DriveApplicationServiceImpl(DriveRepository driveRepository,
                                        DriveApplicationRepository driveApplicationRepository,
                                        StudentRepository studentRepository,
                                        PlacementEligibilityGuard eligibilityGuard) {
        this.driveRepository = driveRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.studentRepository = studentRepository;
        this.eligibilityGuard = eligibilityGuard;
    }

    @Override
    @Transactional
    public DriveApplicationResponse expressInterest(Long driveId, Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));

        Drive drive = driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Drive not found: " + driveId));

        if (!eligibilityGuard.isEligible(student, drive)) {
            throw new ForbiddenException("You do not meet the eligibility criteria for this opportunity");
        }

        if (driveApplicationRepository.existsByDrive_IdAndStudent_Id(driveId, student.getId())) {
            throw new ConflictException("You have already expressed interest in this opportunity");
        }

        DriveApplication application = new DriveApplication();
        application.setDrive(drive);
        application.setStudent(student);

        return DriveApplicationResponse.from(driveApplicationRepository.save(application));
    }
}
