package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.placement.dto.request.CreatePlacementRequest;
import com.careerlabs.lms.api.placement.dto.response.PlacementResponse;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveType;
import com.careerlabs.lms.api.placement.entity.Offer;
import com.careerlabs.lms.api.placement.entity.Placement;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.PlacementRepository;
import com.careerlabs.lms.api.placement.service.PlacementService;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class PlacementServiceImpl implements PlacementService {

    private final PlacementRepository placementRepository;
    private final StudentRepository studentRepository;
    private final DriveRepository driveRepository;
    private final NotificationService notificationService;

    public PlacementServiceImpl(PlacementRepository placementRepository,
                                StudentRepository studentRepository,
                                DriveRepository driveRepository,
                                NotificationService notificationService) {
        this.placementRepository = placementRepository;
        this.studentRepository = studentRepository;
        this.driveRepository = driveRepository;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PlacementResponse getForStudent(Long studentUserId) {
        Student student = studentRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));
        return placementRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .findFirst()
                .map(PlacementResponse::from)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlacementResponse> listAll() {
        return placementRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PlacementResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public PlacementResponse record(CreatePlacementRequest request, Long adminUserId) {
        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + request.studentId()));

        Drive drive = null;
        if (request.driveId() != null) {
            drive = driveRepository.findById(request.driveId())
                    .orElseThrow(() -> new ResourceNotFoundException("Drive not found: " + request.driveId()));
        }

        Placement placement = buildPlacement(student, drive, request.companyName(), request.role(),
                request.ctc(), request.joiningDate(), request.placementDate(),
                request.placementType() != null ? request.placementType() : DriveType.CAMPUS, null);

        placement = placementRepository.save(placement);
        markStudentPlaced(student);
        notifyPlaced(student, placement);
        return PlacementResponse.from(placement);
    }

    @Override
    @Transactional
    public PlacementResponse createFromOffer(Offer offer, Long adminUserId) {
        Student student = offer.getStudent();
        String ctc = offer.getCtc();
        LocalDate joiningDate = offer.getJoiningDate();
        DriveType type = offer.getDrive().getDriveType();

        Placement placement = buildPlacement(student, offer.getDrive(), offer.getDrive().getCompanyName(),
                offer.getRole(), ctc, joiningDate, LocalDate.now(), type, offer);
        placement = placementRepository.save(placement);
        markStudentPlaced(student);
        notifyPlaced(student, placement);
        return PlacementResponse.from(placement);
    }

    private Placement buildPlacement(Student student, Drive drive, String companyName, String role,
                                     String ctc, LocalDate joiningDate, LocalDate placementDate,
                                     DriveType type, Offer offer) {
        Placement placement = new Placement();
        placement.setStudent(student);
        placement.setDrive(drive);
        placement.setCompanyName(companyName);
        placement.setRole(role);
        placement.setCtc(ctc);
        placement.setJoiningDate(joiningDate);
        placement.setPlacementDate(placementDate != null ? placementDate : LocalDate.now());
        placement.setPlacementType(type);
        placement.setOffer(offer);
        return placement;
    }

    private void markStudentPlaced(Student student) {
        student.setPlacementStatus(PlacementStatus.PLACED);
        studentRepository.save(student);
    }

    private void notifyPlaced(Student student, Placement placement) {
        notificationService.notifyUser(student.getUser().getId(),
                "🎊 Placement Confirmed!",
                "Your placement with " + placement.getCompanyName() + " (" + placement.getRole() + ") has been recorded. Congratulations!",
                NotificationType.SUCCESS, "/student/offers");
    }
}